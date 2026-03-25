const Team = require('../models/Team');
const Player = require('../models/Player');
const User = require('../models/User');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
const getTeams = async (req, res, next) => {
    try {
        const teams = await Team.find();
        res.status(200).json(teams);
    } catch (error) {
        next(error);
    }
};

// @desc    Get my teams
// @route   GET /api/teams/my
// @access  Private
const getMyTeams = async (req, res, next) => {
    try {
        const teams = await Team.find({ createdBy: req.user.id });
        res.status(200).json(teams);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a team
// @route   POST /api/teams
// @access  Private
const createTeam = async (req, res, next) => {
    try {
        const { name, city } = req.body;

        if (!name) {
            res.status(400);
            throw new Error('Please add a team name');
        }

        const team = await Team.create({
            name,
            city,
            createdBy: req.user.id,
        });

        res.status(201).json(team);
    } catch (error) {
        next(error);
    }
};

// @desc    Add player to team
// @route   POST /api/teams/:id/players
// @access  Private
const addPlayerToTeam = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const team = await Team.findById(req.params.id);

        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }

        if (team.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized');
        }

        const user = await User.findById(userId);
        if (!user || user.role !== 'player') {
            res.status(400);
            throw new Error('Invalid user selected or user is not registered as a player');
        }

        if (!user.isVerified) {
            res.status(400);
            throw new Error('This player has not verified their profile. They must provide all details in their profile page first.');
        }

        const player = await Player.create({
            name: user.name,
            role: user.playerRole || 'All-rounder',
            battingStyle: user.battingStyle || 'Right-hand bat',
            bowlingStyle: user.bowlingStyle || 'None',
            team: team._id,
            userRef: user._id,
            createdBy: req.user.id,
        });

        team.players.push(player._id);
        await team.save();

        res.status(201).json(player);
    } catch (error) {
        next(error);
    }
};

// @desc    Get team details with players
// @route   GET /api/teams/:id
// @access  Public
const getTeamById = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id).populate('players');
        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }
        res.status(200).json(team);
    } catch (error) {
        next(error);
    }
};

// @desc    Get players of a specific team
// @route   GET /api/teams/:id/players
// @access  Public
const getTeamPlayers = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id).populate('players');
        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }
        res.status(200).json(team.players);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a team
// @route   DELETE /api/teams/:id
// @access  Private
const deleteTeam = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id);

        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }

        // Check for user
        if (team.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized to delete this team');
        }

        // Delete associated players first
        await Player.deleteMany({ team: team._id });
        
        // Delete team
        await team.deleteOne();

        res.status(200).json({ id: req.params.id, message: 'Team and associated players deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTeams,
    getMyTeams,
    createTeam,
    addPlayerToTeam,
    getTeamById,
    getTeamPlayers,
    deleteTeam
};
