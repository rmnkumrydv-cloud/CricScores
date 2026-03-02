const mongoose = require('mongoose');

const tournamentSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a tournament name'],
        },
        organizer: {
            type: String,
            required: [true, 'Please add an organizer name'],
        },
        startDate: {
            type: Date,
            required: [true, 'Please add a start date'],
        },
        endDate: {
            type: Date,
            required: [true, 'Please add an end date'],
        },
        teams: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Team',
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String, // Upcoming, Ongoing, Completed
            default: 'Upcoming',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Tournament', tournamentSchema);
