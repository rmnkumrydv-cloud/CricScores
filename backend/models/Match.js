const mongoose = require('mongoose');

const matchSchema = mongoose.Schema(
    {
        tournament: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tournament',
        },
        matchName: {
            type: String,
            default: '',
        },
        playingXI1: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player',
            },
        ],
        playingXI2: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player',
            },
        ],
        date: {
            type: Date,
            default: Date.now,
        },
        venue: {
            type: String,
        },
        status: {
            type: String, // Scheduled, Live, Completed
            default: 'Scheduled',
        },
        tossWinner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
        },
        tossDecision: {
            type: String, // Bat, Bowl
        },
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
        },
        result: {
            type: String, // Win, Draw, Tie, No Result
        },
        targetRuns: {
            type: Number,
        },
        totalOvers: {
            type: Number,
            default: 20,
        },
        playerOfTheMatch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
        },
        currentStriker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
        },
        currentNonStriker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
        },
        currentBowler: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
        },
        innings: [
            {
                battingTeam: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Team',
                },
                bowlingTeam: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Team',
                },
                status: {
                    type: String, // Live, Completed
                    default: 'Live',
                },
                runs: { type: Number, default: 0 },
                wickets: { type: Number, default: 0 },
                overs: { type: Number, default: 0.0 }, // 1.2 means 1 over 2 balls
                extras: {
                    wides: { type: Number, default: 0 },
                    noBalls: { type: Number, default: 0 },
                    byes: { type: Number, default: 0 },
                    legByes: { type: Number, default: 0 },
                },
                battingStats: [
                    {
                        player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                        runs: { type: Number, default: 0 },
                        balls: { type: Number, default: 0 },
                        fours: { type: Number, default: 0 },
                        sixes: { type: Number, default: 0 },
                        isOut: { type: Boolean, default: false },
                        dismissalType: String,
                        fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                        bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
                    }
                ],
                bowlingStats: [
                    {
                        player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                        overs: { type: Number, default: 0 },
                        balls: { type: Number, default: 0 },
                        maidens: { type: Number, default: 0 },
                        runsConceded: { type: Number, default: 0 },
                        wickets: { type: Number, default: 0 }
                    }
                ],
                oversHistory: [
                    {
                        overNumber: Number,
                        bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                        runsConceded: Number,
                        wicketsTaken: Number,
                        balls: [
                            {
                                batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                                bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                                nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                                runs: Number,
                                event: String, // Wicket, Boundary, 0, 1, 2, 3
                                isExtra: Boolean,
                                extraType: String, // Wide, NoBall, Bye, LegBye
                                wicketDetail: {
                                    type: { type: String }, // Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket
                                    fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
                                },
                            },
                        ],
                    },
                ],
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Match', matchSchema);
