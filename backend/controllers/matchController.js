const Match = require('../models/Match');
const Team = require('../models/Team');

/**
 * Utility: Populate all required match references
 * Helps avoid repeating populate logic everywhere
 */
const populateMatch = async (match) => {
    return await match.populate([
        'tournament',
        'playingXI1',
        'playingXI2',
        'winner',
        'playerOfTheMatch',
        'currentStriker',
        'currentNonStriker',
        'currentBowler',

        // Nested population
        {
            path: 'innings.battingTeam',
            populate: { path: 'players' }
        },
        {
            path: 'innings.bowlingTeam',
            populate: { path: 'players' }
        },

        'innings.battingStats.player',
        'innings.battingStats.bowler',
        'innings.battingStats.fielder',
        'innings.bowlingStats.player',

        'innings.oversHistory.bowler',
        'innings.oversHistory.balls.batsman',
        'innings.oversHistory.balls.nonStriker',
        'innings.oversHistory.balls.bowler'
    ]);
};

/**
 * @desc    Initialize a match with Playing XI
 * @route   POST /api/matches/initialize
 * @access  Private (Umpire only)
 */
const initializeMatch = async (req, res, next) => {
    try {
        if (req.user.role !== 'umpire') {
            return res.status(403).json({ message: 'Only umpires can initialize matches' });
        }

        const {
            team1Id, team2Id,
            playingXI1, playingXI2,
            tournamentId, matchName,
            date, venue, totalOvers
        } = req.body;

        // Validate playing XI
        if (playingXI1.length !== 11 || playingXI2.length !== 11) {
            return res.status(400).json({ message: 'Each team must have exactly 11 players' });
        }

        const match = await Match.create({
            tournament: tournamentId,
            matchName: matchName || '',
            playingXI1,
            playingXI2,
            date,
            venue,
            totalOvers: totalOvers || 20,
            createdBy: req.user.id,
            status: 'Scheduled',

            // Initialize innings
            innings: [
                { battingTeam: team1Id, bowlingTeam: team2Id, oversHistory: [] },
                { battingTeam: team2Id, bowlingTeam: team1Id, oversHistory: [] }
            ]
        });

        await populateMatch(match);
        res.status(201).json(match);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Conduct toss and start match
 * @route   PUT /api/matches/:id/start
 */
const startMatch = async (req, res, next) => {
    try {
        const { tossWinner, tossDecision } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) throw new Error('Match not found');

        if (match.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        match.tossWinner = tossWinner;
        match.tossDecision = tossDecision;
        match.status = 'Live';

        /**
         * Toss Logic:
         * Swap innings based on decision
         */
        const team1 = match.innings[0].battingTeam;
        const team2 = match.innings[0].bowlingTeam;

        if (tossDecision === 'Bowl' && tossWinner.toString() === team1.toString()) {
            [match.innings[0].battingTeam, match.innings[0].bowlingTeam] = [team2, team1];
            [match.innings[1].battingTeam, match.innings[1].bowlingTeam] = [team1, team2];
        }

        if (tossDecision === 'Bat' && tossWinner.toString() === team2.toString()) {
            [match.innings[0].battingTeam, match.innings[0].bowlingTeam] = [team2, team1];
            [match.innings[1].battingTeam, match.innings[1].bowlingTeam] = [team1, team2];
        }

        match.innings[0].status = 'Live';

        await match.save();
        await populateMatch(match);

        res.status(200).json(match);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Record a ball (core match logic)
 * @route   POST /api/matches/:id/ball
 */
const recordBall = async (req, res, next) => {
    try {
        const { inningsIndex, ballData } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) throw new Error('Match not found');

        if (match.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const innings = match.innings[inningsIndex];
        if (innings.status === 'Completed') {
            return res.status(400).json({ message: 'Innings already completed' });
        }

        /**
         * STEP 1: Handle Overs
         */
        let currentOver = innings.oversHistory.at(-1);

        const legalBalls = currentOver
            ? currentOver.balls.filter(b => !b.isExtra || !['Wide', 'NoBall'].includes(b.extraType)).length
            : 6;

        // Start new over if needed
        if (legalBalls === 6) {
            innings.oversHistory.push({
                overNumber: innings.oversHistory.length + 1,
                bowler: ballData.bowler,
                runsConceded: 0,
                wicketsTaken: 0,
                balls: []
            });
            currentOver = innings.oversHistory.at(-1);
        }

        currentOver.balls.push(ballData);

        /**
         * STEP 2: Update innings stats
         */
        innings.runs += ballData.runs;

        if (ballData.event === 'Wicket') {
            innings.wickets++;
            currentOver.wicketsTaken++;
        }

        /**
         * STEP 3: Extras handling
         */
        if (ballData.isExtra) {
            const extras = innings.extras;
            if (ballData.extraType === 'Wide') extras.wides += ballData.runs;
            if (ballData.extraType === 'NoBall') extras.noBalls++;
            if (ballData.extraType === 'Bye') extras.byes += ballData.runs;
            if (ballData.extraType === 'LegBye') extras.legByes += ballData.runs;
        }

        /**
         * STEP 4: Batting stats update
         */
        let batter = innings.battingStats.find(s => s.player.toString() === ballData.batsman.toString());
        if (!batter) {
            innings.battingStats.push({ player: ballData.batsman });
            batter = innings.battingStats.at(-1);
        }

        if (!ballData.isExtra || !['Wide', 'NoBall'].includes(ballData.extraType)) {
            batter.balls++;
            batter.runs += ballData.runs;
        }

        /**
         * STEP 5: Bowling stats update
         */
        let bowler = innings.bowlingStats.find(s => s.player.toString() === ballData.bowler.toString());
        if (!bowler) {
            innings.bowlingStats.push({ player: ballData.bowler });
            bowler = innings.bowlingStats.at(-1);
        }

        bowler.balls = (bowler.balls || 0) + 1;
        bowler.runsConceded += ballData.runs;

        /**
         * STEP 6: Check innings end
         */
        const totalBalls = innings.oversHistory.reduce(
            (acc, o) => acc + o.balls.length, 0
        );

        if (totalBalls >= match.totalOvers * 6 || innings.wickets >= 10) {
            innings.status = 'Completed';
        }

        await match.save();
        await populateMatch(match);

        res.status(200).json(match);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Get match by ID
 */
const getMatchById = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) throw new Error('Match not found');

        await populateMatch(match);
        res.status(200).json(match);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Delete match
 */
const deleteMatch = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) throw new Error('Match not found');

        if (match.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await match.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: 'Match deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    initializeMatch,
    getMatchById,
    startMatch,
    recordBall,
    deleteMatch
};
