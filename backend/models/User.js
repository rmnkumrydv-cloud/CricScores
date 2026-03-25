const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        username: {
            type: String,
            required: [true, 'Please add a username'],
            unique: true,
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        role: {
            type: String,
            enum: ['player', 'umpire'],
            default: 'player',
        },
        age: {
            type: Number,
            default: null,
        },
        profilePic: {
            type: String,
            default: 'https://ui-avatars.com/api/?name=User&background=random',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        playerRole: {
            type: String,
            default: 'All-rounder',
        },
        battingStyle: {
            type: String,
            default: 'Right-hand bat',
        },
        bowlingStyle: {
            type: String,
            default: 'None',
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
