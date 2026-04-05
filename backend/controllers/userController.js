const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, username, email, password, role, signupCode } = req.body;

        if (!name || !username || !email || !password) {
            res.status(400);
            throw new Error('Please add all required fields');
        }

        const userExists = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (userExists) {
            res.status(400);
            throw new Error('User with this email or username already exists');
        }

        let finalRole = 'player';
        if (role === 'umpire') {
            const validSignupCode = process.env.UMPIRE_SIGNUP_CODE || 'UMPIRE2026';
            if (signupCode !== validSignupCode) {
                res.status(400);
                throw new Error('Invalid Umpire Signup Code');
            }
            finalRole = 'umpire';
        }

        const user = await User.create({
            name,
            username,
            email,
            password,
            role: finalRole,
            playerRole: 'All-rounder',
            battingStyle: 'Right-hand bat',
            bowlingStyle: 'None',
            profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                isVerified: user.isVerified,
                token: generateToken(user.id),
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                isVerified: user.isVerified,
                token: generateToken(user.id),
            });
        } else {
            res.status(401);
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const u = req.user;
        res.status(200).json({
            _id: u._id,
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            age: u.age,
            profilePic: u.profilePic,
            isVerified: u.isVerified,
            playerRole: u.playerRole,
            battingStyle: u.battingStyle,
            bowlingStyle: u.bowlingStyle,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all players
// @route   GET /api/users/players
// @access  Public
const getPlayers = async (req, res, next) => {
    try {
        const players = await User.find({ role: 'player', isVerified: true }).select('-password');
        console.log(`[${new Date().toISOString()}] getPlayers returned ${players.length} verified players.`);
        res.status(200).json(players);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all umpires
// @route   GET /api/users/umpires
// @access  Public
const getUmpires = async (req, res, next) => {
    try {
        const umpires = await User.find({ role: 'umpire' }).select('-password');
        res.status(200).json(umpires);
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updateData = {
            name: req.body.name,
            age: req.body.age,
            profilePic: req.body.profilePic,
            playerRole: req.body.playerRole,
            battingStyle: req.body.battingStyle,
            bowlingStyle: req.body.bowlingStyle
        };

        if (req.body.isVerified !== undefined) {
            updateData.isVerified = req.body.isVerified === true;
        }

        // Remove undefined fields so they don't overwrite with null
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) delete updateData[key];
        });

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            res.status(404);
            throw new Error('User not found');
        }

        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            age: updatedUser.age,
            isVerified: updatedUser.isVerified === true,
            profilePic: updatedUser.profilePic,
            playerRole: updatedUser.playerRole,
            battingStyle: updatedUser.battingStyle,
            bowlingStyle: updatedUser.bowlingStyle,
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        next(error);
    }
};

// @desc    Get user lifetime stats
// @route   GET /api/users/me/stats
// @access  Private
const getUserStats = async (req, res, next) => {
    try {
        if (req.user.role === 'umpire') {
            const matchesUmpired = await Match.countDocuments({ createdBy: req.user.id });
            const tournamentsManaged = await Tournament.countDocuments({ createdBy: req.user.id });
            return res.status(200).json({
                role: 'umpire',
                matchesUmpired,
                tournamentsManaged
            });
        }

        const userPlayers = await Player.find({ userRef: req.user.id }).select('_id');
        const playerIds = userPlayers.map(p => p._id);
        
        if (playerIds.length === 0) {
            return res.status(200).json({
                role: 'player',
                matchesPlayed: 0, totalRuns: 0, ballsFaced: 0, fours: 0, sixes: 0,
                totalWickets: 0, runsConceded: 0, oversBowled: 0
            });
        }

        const battingAggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.battingStats" },
            { $match: { "innings.battingStats.player": { $in: playerIds } } },
            {
                $group: {
                    _id: null,
                    totalRuns: { $sum: "$innings.battingStats.runs" },
                    matches: { $addToSet: "$_id" },
                    ballsFaced: { $sum: "$innings.battingStats.balls" },
                    fours: { $sum: "$innings.battingStats.fours" },
                    sixes: { $sum: "$innings.battingStats.sixes" }
                }
            }
        ]);

        const bowlingAggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.bowlingStats" },
            { $match: { "innings.bowlingStats.player": { $in: playerIds } } },
            {
                $group: {
                    _id: null,
                    totalWickets: { $sum: "$innings.bowlingStats.wickets" },
                    oversBowled: { $sum: "$innings.bowlingStats.overs" },
                    runsConceded: { $sum: "$innings.bowlingStats.runsConceded" },
                    matches: { $addToSet: "$_id" }
                }
            }
        ]);

        const batting = battingAggregation[0] || { matches: [], totalRuns: 0, ballsFaced: 0, fours: 0, sixes: 0 };
        const bowling = bowlingAggregation[0] || { matches: [], totalWickets: 0, oversBowled: 0, runsConceded: 0 };

        const combinedMatches = new Set([
            ...(batting.matches || []),
            ...(bowling.matches || [])
        ]);

        res.status(200).json({
            matchesPlayed: combinedMatches.size,
            totalRuns: batting.totalRuns,
            ballsFaced: batting.ballsFaced,
            fours: batting.fours,
            sixes: batting.sixes,
            totalWickets: bowling.totalWickets,
            oversBowled: bowling.oversBowled,
            runsConceded: bowling.runsConceded
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public player lifetime stats by User ID
// @route   GET /api/users/:id/stats
// @access  Public
const getPlayerStats = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const userPlayers = await Player.find({ userRef: userId }).select('_id');
        const playerIds = userPlayers.map(p => p._id);
        
        if (playerIds.length === 0) {
            return res.status(200).json({
                matchesPlayed: 0, totalRuns: 0, ballsFaced: 0, fours: 0, sixes: 0,
                totalWickets: 0, runsConceded: 0, oversBowled: 0
            });
        }

        const battingAggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.battingStats" },
            { $match: { "innings.battingStats.player": { $in: playerIds } } },
            {
                $group: {
                    _id: null,
                    totalRuns: { $sum: "$innings.battingStats.runs" },
                    matches: { $addToSet: "$_id" },
                    ballsFaced: { $sum: "$innings.battingStats.balls" },
                    fours: { $sum: "$innings.battingStats.fours" },
                    sixes: { $sum: "$innings.battingStats.sixes" }
                }
            }
        ]);

        const bowlingAggregation = await Match.aggregate([
            { $unwind: "$innings" },
            { $unwind: "$innings.bowlingStats" },
            { $match: { "innings.bowlingStats.player": { $in: playerIds } } },
            {
                $group: {
                    _id: null,
                    totalWickets: { $sum: "$innings.bowlingStats.wickets" },
                    oversBowled: { $sum: "$innings.bowlingStats.overs" },
                    runsConceded: { $sum: "$innings.bowlingStats.runsConceded" },
                    matches: { $addToSet: "$_id" }
                }
            }
        ]);

        const batting = battingAggregation[0] || { matches: [], totalRuns: 0, ballsFaced: 0, fours: 0, sixes: 0 };
        const bowling = bowlingAggregation[0] || { matches: [], totalWickets: 0, oversBowled: 0, runsConceded: 0 };

        const combinedMatches = new Set([
            ...(batting.matches || []),
            ...(bowling.matches || [])
        ]);

        res.status(200).json({
            matchesPlayed: combinedMatches.size,
            totalRuns: batting.totalRuns,
            ballsFaced: batting.ballsFaced,
            fours: batting.fours,
            sixes: batting.sixes,
            totalWickets: bowling.totalWickets,
            oversBowled: bowling.oversBowled,
            runsConceded: bowling.runsConceded
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public user by ID
// @route   GET /api/users/:id
// @access  Public
const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password -email');
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUmpires,
    getPlayers,
    updateUserProfile,
    getUserStats,
    getPlayerStats,
    getUser
};
