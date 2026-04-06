const Player = require('../models/Player');
const Match = require('../models/Match');

/**
 * @desc    Get top batters by total runs
 * @route   GET /api/leaderboard/batting
 * @access  Public
 */
const getTopBatters = async (req, res, next) => {
    try {
        // Aggregate batting stats from all matches
        const aggregation = await Match.aggregate([

            // Break innings array into individual documents
            { $unwind: "$innings" },

            // Break battingStats array
            { $unwind: "$innings.battingStats" },

            // Group by player ID and calculate stats
            {
                $group: {
                    _id: "$innings.battingStats.player",

                    totalRuns: { $sum: "$innings.battingStats.runs" },
                    totalBalls: { $sum: "$innings.battingStats.balls" },
                    totalFours: { $sum: "$innings.battingStats.fours" },
                    totalSixes: { $sum: "$innings.battingStats.sixes" },

                    // Count unique matches played
                    matchesPlayed: { $addToSet: "$_id" }
                }
            },

            // Add calculated fields (derived stats)
            {
                $addFields: {
                    matches: { $size: "$matchesPlayed" },

                    // Strike Rate = (Runs / Balls) * 100
                    strikeRate: {
                        $cond: [
                            { $eq: ["$totalBalls", 0] },
                            0,
                            { $multiply: [{ $divide: ["$totalRuns", "$totalBalls"] }, 100] }
                        ]
                    }
                }
            },

            // Sort by total runs (descending)
            { $sort: { totalRuns: -1 } },

            // Limit top 10 players
            { $limit: 10 },

            // Join with Player collection
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerInfo"
                }
            },

            // Convert array to object
            { $unwind: "$playerInfo" },

            // Optional: clean output
            {
                $project: {
                    _id: 0,
                    playerId: "$_id",
                    name: "$playerInfo.name",
                    totalRuns: 1,
                    matches: 1,
                    totalBalls: 1,
                    totalFours: 1,
                    totalSixes: 1,
                    strikeRate: { $round: ["$strikeRate", 2] }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: aggregation.length,
            data: aggregation
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Get top bowlers by total wickets
 * @route   GET /api/leaderboard/bowling
 * @access  Public
 */
const getTopBowlers = async (req, res, next) => {
    try {
        const aggregation = await Match.aggregate([

            // Break innings array
            { $unwind: "$innings" },

            // Break bowling stats array
            { $unwind: "$innings.bowlingStats" },

            // Group by bowler
            {
                $group: {
                    _id: "$innings.bowlingStats.player",

                    totalWickets: { $sum: "$innings.bowlingStats.wickets" },
                    totalRunsConceded: { $sum: "$innings.bowlingStats.runsConceded" },
                    totalBalls: { $sum: "$innings.bowlingStats.balls" },

                    matchesPlayed: { $addToSet: "$_id" }
                }
            },

            // Add derived stats
            {
                $addFields: {
                    matches: { $size: "$matchesPlayed" },

                    // Economy = Runs / Overs (balls/6)
                    economy: {
                        $cond: [
                            { $eq: ["$totalBalls", 0] },
                            0,
                            {
                                $divide: [
                                    "$totalRunsConceded",
                                    { $divide: ["$totalBalls", 6] }
                                ]
                            }
                        ]
                    }
                }
            },

            // Sort: wickets desc, runs asc (better economy)
            { $sort: { totalWickets: -1, totalRunsConceded: 1 } },

            { $limit: 10 },

            // Join with player collection
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerInfo"
                }
            },

            { $unwind: "$playerInfo" },

            // Clean output
            {
                $project: {
                    _id: 0,
                    playerId: "$_id",
                    name: "$playerInfo.name",
                    totalWickets: 1,
                    totalRunsConceded: 1,
                    matches: 1,
                    economy: { $round: ["$economy", 2] }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: aggregation.length,
            data: aggregation
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTopBatters,
    getTopBowlers
};
