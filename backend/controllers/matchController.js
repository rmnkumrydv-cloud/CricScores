const Match = require('../models/Match');
const Team = require('../models/Team');

// @desc    Create a match
// @route   POST /api/matches
// @access  Private
// @desc    Create a match and initialize Playing XI
// @route   POST /api/matches/initialize
// @access  Private
const initializeMatch = async (req, res, next) => {
    try {
        const { team1Id, team2Id, playingXI1, playingXI2, tournamentId, date, venue } = req.body;

        if (playingXI1.length !== 11 || playingXI2.length !== 11) {
            res.status(400);
            throw new Error('Each team must have exactly 11 players');
        }

        const match = await Match.create({
            tournament: tournamentId,
            playingXI1,
            playingXI2,
            date,
            venue,
            createdBy: req.user.id,
            status: 'Scheduled',
            innings: [
                { battingTeam: team1Id, bowlingTeam: team2Id, oversHistory: [] },
                { battingTeam: team2Id, bowlingTeam: team1Id, oversHistory: [] }
            ]
        });

        res.status(201).json(match);
    } catch (error) {
        next(error);
    }
};

// @desc    Conduct Toss and Start Match
// @route   PUT /api/matches/:id/start
// @access  Private
const startMatch = async (req, res, next) => {
    try {
        const { tossWinner, tossDecision } = req.body;
        const match = await Match.findById(req.params.id);

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }

        match.tossWinner = tossWinner;
        match.tossDecision = tossDecision;
        match.status = 'Live';

        // Swap innings if decision is to bowl
        if (tossDecision === 'Bowl') {
            const team1 = match.innings[0].battingTeam;
            const team2 = match.innings[0].bowlingTeam;

            if (tossWinner.toString() === team1.toString()) {
                // Team 1 wins and bowls
                match.innings[0].battingTeam = team2;
                match.innings[0].bowlingTeam = team1;
                match.innings[1].battingTeam = team1;
                match.innings[1].bowlingTeam = team2;
            } else {
                // Team 2 wins and bowls
                // (Already defaulted to Team 2 batting in 2nd innings)
            }
        } else if (tossDecision === 'Bat') {
            const team1 = match.innings[0].battingTeam;
            const team2 = match.innings[0].bowlingTeam;

            if (tossWinner.toString() === team2.toString()) {
                // Team 2 wins and bats
                match.innings[0].battingTeam = team2;
                match.innings[0].bowlingTeam = team1;
                match.innings[1].battingTeam = team1;
                match.innings[1].bowlingTeam = team2;
            }
        }

        await match.save();
        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

// @desc    Record a Ball (Umpire Mode)
// @route   POST /api/matches/:id/ball
// @access  Private
const recordBall = async (req, res, next) => {
    try {
        const { inningsIndex, ballData } = req.body;
        const match = await Match.findById(req.params.id);

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }

        const innings = match.innings[inningsIndex];

        // Find or create current over
        let currentOver = innings.oversHistory[innings.oversHistory.length - 1];
        const ballsInLastOver = currentOver ? currentOver.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length : 6;

        if (ballsInLastOver === 6) {
            innings.oversHistory.push({
                overNumber: innings.oversHistory.length + 1,
                bowler: ballData.bowler,
                runsConceded: 0,
                wicketsTaken: 0,
                balls: []
            });
            currentOver = innings.oversHistory[innings.oversHistory.length - 1];
        }

        currentOver.balls.push(ballData);

        // Update Innings Stats
        innings.runs += ballData.runs;
        if (ballData.event === 'Wicket') {
            innings.wickets += 1;
            currentOver.wicketsTaken += 1;
        }

        // Update Overs Count (proper 6-ball calc)
        const totalLegalBalls = innings.oversHistory.reduce((acc, over) => {
            return acc + over.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
        }, 0);

        innings.overs = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10;

        // Update Extras
        if (ballData.isExtra) {
            if (ballData.extraType === 'Wide') innings.extras.wides += ballData.runs;
            if (ballData.extraType === 'NoBall') innings.extras.noBalls += 1;
            if (ballData.extraType === 'Bye') innings.extras.byes += ballData.runs;
            if (ballData.extraType === 'LegBye') innings.extras.legByes += ballData.runs;
        }

        // Update Batting Stats
        let batterStats = innings.battingStats.find(s => s.player.toString() === ballData.batsman.toString());
        if (!batterStats) {
            innings.battingStats.push({ player: ballData.batsman });
            batterStats = innings.battingStats[innings.battingStats.length - 1];
        }

        if (!ballData.isExtra || (ballData.extraType !== 'Wide' && ballData.extraType !== 'NoBall')) {
            batterStats.balls += 1;
            batterStats.runs += ballData.runs;
            if (ballData.runs === 4) batterStats.fours += 1;
            if (ballData.runs === 6) batterStats.sixes += 1;
        } else if (ballData.isExtra && ballData.extraType === 'NoBall') {
            batterStats.runs += ballData.runs; // Runs off bat on No Ball
        }

        if (ballData.event === 'Wicket') {
            batterStats.isOut = true;
            batterStats.dismissalType = ballData.wicketDetail.type;
            batterStats.fielder = ballData.wicketDetail.fielder;
            batterStats.bowler = ballData.bowler;
        }

        // Update Bowling Stats
        let bowlerStats = innings.bowlingStats.find(s => s.player.toString() === ballData.bowler.toString());
        if (!bowlerStats) {
            innings.bowlingStats.push({ player: ballData.bowler });
            bowlerStats = innings.bowlingStats[innings.bowlingStats.length - 1];
        }

        if (!ballData.isExtra || (ballData.extraType !== 'Wide' && ballData.extraType !== 'NoBall')) {
            // Legal ball for bowler
            const currentBowlerBalls = currentOver.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
            bowlerStats.overs = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10; // This is a bit lazy, should ideally track per bowler
        }

        if (ballData.extraType === 'Wide' || ballData.extraType === 'NoBall') {
            bowlerStats.runsConceded += (ballData.runs + 1);
        } else if (!ballData.isExtra) {
            bowlerStats.runsConceded += ballData.runs;
        }

        if (ballData.event === 'Wicket' && !['Run Out', 'Timed Out', 'Retired Hurt'].includes(ballData.wicketDetail.type)) {
            bowlerStats.wickets += 1;
        }

        currentOver.runsConceded += ballData.runs;

        // Check for Innings End
        const isMaxOvers = totalLegalBalls >= 120; // 20 over match
        const isAllOut = innings.wickets >= 10;
        const target = inningsIndex === 1 ? (match.innings[0].runs + 1) : null;
        const isTargetReached = target && innings.runs >= target;

        if (isMaxOvers || isAllOut || isTargetReached) {
            innings.status = 'Completed';
            if (inningsIndex === 0) {
                match.targetRuns = innings.runs + 1;
            } else {
                match.status = 'Completed';
                match.winner = isTargetReached ? innings.battingTeam : match.innings[0].battingTeam;
                match.result = isTargetReached ? 'Win' : (innings.runs === match.innings[0].runs ? 'Tie' : 'Win');
            }
        }

        await match.save();

        // Sync current player fields
        match.currentStriker = ballData.batsman;
        match.currentNonStriker = ballData.nonStriker;
        match.currentBowler = ballData.bowler;
        await match.save();

        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

const getMatchById = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('tournament')
            .populate('playingXI1')
            .populate('playingXI2')
            .populate('innings.battingTeam')
            .populate('innings.bowlingTeam')
            .populate('innings.battingTeam.players')
            .populate('innings.bowlingTeam.players')
            .populate('currentStriker')
            .populate('currentNonStriker')
            .populate('currentBowler')
            .populate('innings.oversHistory.bowler')
            .populate('innings.oversHistory.balls.batsman')
            .populate('innings.oversHistory.balls.bowler')
            .populate('innings.oversHistory.balls.wicketDetail.fielder');

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }
        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

const setPlayerOfTheMatch = async (req, res, next) => {
    try {
        const { playerId } = req.body;
        const match = await Match.findById(req.params.id);

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }

        if (match.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('Not authorized');
        }

        match.playerOfTheMatch = playerId;
        await match.save();

        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

const getMatches = async (req, res, next) => {
    try {
        const { tournamentId, limit, status } = req.query;
        const query = {};

        if (tournamentId) query.tournament = tournamentId;
        if (status) query.status = status;

        const matches = await Match.find(query)
            .sort({ createdAt: -1 })
            .limit(limit ? parseInt(limit) : 50)
            .populate('innings.battingTeam innings.bowlingTeam winner playerOfTheMatch');

        res.status(200).json(matches);
    } catch (error) {
        next(error);
    }
};

const updateCurrentPlayers = async (req, res, next) => {
    try {
        const { strikerId, nonStrikerId, bowlerId } = req.body;
        const match = await Match.findById(req.params.id);

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }

        if (strikerId) match.currentStriker = strikerId;
        if (nonStrikerId) match.currentNonStriker = nonStrikerId;
        if (bowlerId) match.currentBowler = bowlerId;

        await match.save();
        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    initializeMatch,
    getMatchById,
    startMatch,
    recordBall,
    setPlayerOfTheMatch,
    getMatches,
    updateCurrentPlayers
};
