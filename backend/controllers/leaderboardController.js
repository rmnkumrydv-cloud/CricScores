const Player = require('../models/Player');
const Match = require('../models/Match');

// @desc    Get top batters by total runs
// @route   GET /api/leaderboard/batting
// @access  Public
const getTopBatters = async (req, res, next) => {
    try {
        // This is a naive implementation. For a real app, you'd want to aggregate 
        // from the Match.innings.battingStats across all completed matches.
        // For now, let's just sort by player.totalRuns if that's being updated,
        // OR aggregate from matches.

        const aggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.battingStats" },
            {
                $group: {
                    _id: "$innings.battingStats.player",
                    totalRuns: { $sum: "$innings.battingStats.runs" },
                    matches: { $addToSet: "$_id" },
                    balls: { $sum: "$innings.battingStats.balls" },
                    fours: { $sum: "$innings.battingStats.fours" },
                    sixes: { $sum: "$innings.battingStats.sixes" }
                }
            },
            { $sort: { totalRuns: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerInfo"
                }
            },
            { $unwind: "$playerInfo" }
        ]);

        res.status(200).json(aggregation);
    } catch (error) {
        next(error);
    }
};

// @desc    Get top bowlers by total wickets
// @route   GET /api/leaderboard/bowling
// @access  Public
const getTopBowlers = async (req, res, next) => {
    try {
        const aggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.bowlingStats" },
            {
                $group: {
                    _id: "$innings.bowlingStats.player",
                    totalWickets: { $sum: "$innings.bowlingStats.wickets" },
                    totalRunsConceded: { $sum: "$innings.bowlingStats.runsConceded" },
                    matches: { $addToSet: "$_id" }
                }
            },
            { $sort: { totalWickets: -1, totalRunsConceded: 1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerInfo"
                }
            },
            { $unwind: "$playerInfo" }
        ]);

        res.status(200).json(aggregation);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTopBatters,
    getTopBowlers
};
