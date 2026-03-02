const mongoose = require('mongoose');

const teamSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a team name'],
        },
        city: {
            type: String,
        },
        captain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
        },
        players: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player',
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

module.exports = mongoose.model('Team', teamSchema);
