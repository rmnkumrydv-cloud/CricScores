const mongoose = require('mongoose');

const playerSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a player name'],
        },
        role: {
            type: String, // Batsman, Bowler, All-rounder, Wicketkeeper
            default: 'All-rounder',
        },
        battingStyle: {
            type: String, // Right-hand bat, Left-hand bat
        },
        bowlingStyle: {
            type: String, // Right-arm fast, Right-arm spin, etc.
        },
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
        },
        userRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Stats aggregation
        matchesPlayed: { type: Number, default: 0 },
        totalRuns: { type: Number, default: 0 },
        totalWickets: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        bestBowling: { type: String, default: '0/0' },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Player', playerSchema);
