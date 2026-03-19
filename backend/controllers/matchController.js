const Match = require('../models/Match');
const Team = require('../models/Team');

const populateMatch = async (match) => {
    return await match.populate([
        'tournament',
        'playingXI1',
        'playingXI2',
        'innings.battingTeam',
        'innings.bowlingTeam',
        {
            path: 'innings.battingTeam',
            populate: { path: 'players' }
        },
        {
            path: 'innings.bowlingTeam',
            populate: { path: 'players' }
        },
        'winner',
        'playerOfTheMatch',
        'currentStriker',
        'currentNonStriker',
        'currentBowler',
        'innings.battingStats.player',
        'innings.bowlingStats.player',
        'innings.battingStats.bowler',
        'innings.battingStats.fielder',
        'innings.oversHistory.bowler',
        'innings.oversHistory.balls.batsman',
        'innings.oversHistory.balls.nonStriker',
        'innings.oversHistory.balls.bowler'
    ]);
};

// @desc    Create a match
// @route   POST /api/matches
// @access  Private
// @desc    Create a match and initialize Playing XI
// @route   POST /api/matches/initialize
// @access  Private
const initializeMatch = async (req, res, next) => {
    try {
        const { team1Id, team2Id, playingXI1, playingXI2, tournamentId, date, venue, totalOvers } = req.body;

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
            totalOvers: totalOvers || 20,
            createdBy: req.user.id,
            status: 'Scheduled',
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

        match.innings[0].status = 'Live';
        await match.save();
        await populateMatch(match);
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

        if (innings.status === 'Completed') {
            res.status(400);
            throw new Error('Innings is already completed');
        }

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

        // Update Extras
        if (ballData.isExtra) {
            if (ballData.extraType === 'Wide') {
                innings.extras.wides += ballData.runs;
            } else if (ballData.extraType === 'NoBall') {
                innings.extras.noBalls += 1;
            } else if (ballData.extraType === 'Bye') {
                innings.extras.byes += ballData.runs;
            } else if (ballData.extraType === 'LegBye') {
                innings.extras.legByes += ballData.runs;
            }
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
            const batRuns = Math.max(0, ballData.runs - 1);
            batterStats.runs += batRuns;
            if (batRuns === 4) batterStats.fours += 1;
            if (batRuns === 6) batterStats.sixes += 1;
        }

        if (ballData.event === 'Wicket') {
            batterStats.isOut = true;
            batterStats.dismissalType = ballData.wicketDetail.type;
            batterStats.fielder = ballData.wicketDetail.fielder;
            batterStats.bowler = ballData.bowler;
        }

        // Update Overs Count (Innings level)
        const totalLegalBalls = innings.oversHistory.reduce((acc, over) => {
            return acc + over.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
        }, 0);
        innings.overs = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10;

        // Update Bowling Stats
        let bowlerStats = innings.bowlingStats.find(s => s.player.toString() === ballData.bowler.toString());
        if (!bowlerStats) {
            innings.bowlingStats.push({ player: ballData.bowler });
            bowlerStats = innings.bowlingStats[innings.bowlingStats.length - 1];
        }

        if (!ballData.isExtra || (ballData.extraType !== 'Wide' && ballData.extraType !== 'NoBall')) {
            // Legal ball for bowler
            bowlerStats.balls = (bowlerStats.balls || 0) + 1;
            bowlerStats.overs = Math.floor(bowlerStats.balls / 6) + (bowlerStats.balls % 6) / 10;
        }

        // Bowling Stats: Only Wide, NoBall, and Bat Runs are conceded by bowler
        let conceded = 0;
        if (ballData.isExtra) {
            if (ballData.extraType === 'Wide' || ballData.extraType === 'NoBall') {
                conceded = ballData.runs;
            } else {
                conceded = 0; // Bye/LegBye
            }
        } else {
            conceded = ballData.runs;
        }

        bowlerStats.runsConceded += conceded;
        currentOver.runsConceded += conceded;

        if (ballData.event === 'Wicket' && !['Run Out', 'Timed Out', 'Retired Hurt'].includes(ballData.wicketDetail.type)) {
            bowlerStats.wickets += 1;
        }

        // Check for Innings End
        const maxBalls = (match.totalOvers || 20) * 6;
        const isMaxOvers = totalLegalBalls >= maxBalls;
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
            // Clear current players on innings end to force re-selection
            match.currentStriker = null;
            match.currentNonStriker = null;
            match.currentBowler = null;
        } else {
            // Normal ball - handle strike rotation
            let s = ballData.batsman;
            let ns = ballData.nonStriker;

            // Rotate if runs are odd (1, 3, 5)
            // Note: In cricket, strike rotates on odd runs actually run.
            // ballData.runs includes the +1 penalty for Wide/NoBall
            let ran = ballData.runs;
            if (ballData.isExtra && (ballData.extraType === 'Wide' || ballData.extraType === 'NoBall')) {
                ran = Math.max(0, ballData.runs - 1);
            }

            if (ran % 2 !== 0) {
                [s, ns] = [ns, s];
            }

            match.currentStriker = s;
            match.currentNonStriker = ns;
            match.currentBowler = ballData.bowler;
        }

        await match.save();

        await populateMatch(match);
        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

const getMatchById = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }
        await populateMatch(match);
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
        await populateMatch(match);
        res.status(200).json(match);
    } catch (error) {
        next(error);
    }
};

const undoBall = async (req, res, next) => {
    try {
        const { inningsIndex } = req.body;
        const match = await Match.findById(req.params.id);

        if (!match) {
            res.status(404);
            throw new Error('Match not found');
        }

        const innings = match.innings[inningsIndex];
        if (!innings || innings.oversHistory.length === 0) {
            res.status(400);
            throw new Error('No balls to undo');
        }

        let currentOver = innings.oversHistory[innings.oversHistory.length - 1];
        if (currentOver.balls.length === 0) {
            innings.oversHistory.pop();
            if (innings.oversHistory.length === 0) {
                res.status(400);
                throw new Error('No balls to undo');
            }
            currentOver = innings.oversHistory[innings.oversHistory.length - 1];
        }

        const undoneBall = currentOver.balls.pop();

        // Revert Innings Stats
        if (undoneBall.event === 'Wicket') {
            innings.wickets -= 1;
            currentOver.wicketsTaken -= 1;
        }

        // Revert Extras
        if (undoneBall.isExtra) {
            if (undoneBall.extraType === 'Wide') {
                innings.extras.wides -= undoneBall.runs;
            } else if (undoneBall.extraType === 'NoBall') {
                innings.extras.noBalls -= 1;
            } else if (undoneBall.extraType === 'Bye') {
                innings.extras.byes -= undoneBall.runs;
            } else if (undoneBall.extraType === 'LegBye') {
                innings.extras.legByes -= undoneBall.runs;
            }
        }

        innings.runs -= undoneBall.runs;

        // Update Overs Count
        const totalLegalBalls = innings.oversHistory.reduce((acc, over) => {
            return acc + over.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
        }, 0);
        innings.overs = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10;

        // Revert Batting Stats
        let batterStats = innings.battingStats.find(s => s.player.toString() === undoneBall.batsman.toString());
        if (batterStats) {
            if (!undoneBall.isExtra || (undoneBall.extraType !== 'Wide' && undoneBall.extraType !== 'NoBall')) {
                batterStats.balls = Math.max(0, batterStats.balls - 1);
                batterStats.runs -= undoneBall.runs;
                if (undoneBall.runs === 4) batterStats.fours -= 1;
                if (undoneBall.runs === 6) batterStats.sixes -= 1;
            } else if (undoneBall.isExtra && undoneBall.extraType === 'NoBall') {
                const batRuns = Math.max(0, undoneBall.runs - 1);
                batterStats.runs -= batRuns;
                if (batRuns === 4) batterStats.fours -= 1;
                if (batRuns === 6) batterStats.sixes -= 1;
            }

            if (undoneBall.event === 'Wicket') {
                batterStats.isOut = false;
                batterStats.dismissalType = undefined;
                batterStats.fielder = undefined;
                batterStats.bowler = undefined;
            }
        }

        // Revert Bowling Stats
        let conceded = 0;
        if (undoneBall.isExtra) {
            if (undoneBall.extraType === 'Wide' || undoneBall.extraType === 'NoBall') {
                conceded = undoneBall.runs;
            } else {
                conceded = 0;
            }
        } else {
            conceded = undoneBall.runs;
        }

        let bowlerStats = innings.bowlingStats.find(s => s.player.toString() === undoneBall.bowler.toString());
        if (bowlerStats) {
            if (!undoneBall.isExtra || (undoneBall.extraType !== 'Wide' && undoneBall.extraType !== 'NoBall')) {
                bowlerStats.balls = Math.max(0, (bowlerStats.balls || 0) - 1);
                bowlerStats.overs = Math.floor(bowlerStats.balls / 6) + (bowlerStats.balls % 6) / 10;
            }
            bowlerStats.runsConceded -= conceded;
            if (undoneBall.event === 'Wicket' && !['Run Out', 'Timed Out', 'Retired Hurt'].includes(undoneBall.wicketDetail.type)) {
                bowlerStats.wickets -= 1;
            }
        }

        currentOver.runsConceded -= conceded;

        // Restore Striker Seleciton
        match.currentStriker = undoneBall.batsman;
        match.currentNonStriker = undoneBall.nonStriker;
        match.currentBowler = undoneBall.bowler;

        // Reset match status if it was completed
        if (match.status === 'Completed') {
            match.status = 'Live';
            match.winner = undefined;
            match.result = undefined;
            innings.status = 'Live';
        }

        await match.save();
        await populateMatch(match);
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
    updateCurrentPlayers,
    undoBall
};
