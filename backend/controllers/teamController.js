const Team = require('../models/Team');
const Player = require('../models/Player');
const User = require('../models/User');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
const getTeams = async (req, res, next) => {
    try {
        // Fetch all teams from DB
        const teams = await Team.find();

        res.status(200).json(teams);
    } catch (error) {
        next(error); // Pass error to middleware
    }
};

// @desc    Get my teams
// @route   GET /api/teams/my
// @access  Private
const getMyTeams = async (req, res, next) => {
    try {
        // Fetch teams created by logged-in user
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

        // Validate required field
        if (!name) {
            res.status(400);
            throw new Error('Please add a team name');
        }

        // Create new team document
        const team = await Team.create({
            name,
            city,
            createdBy: req.user.id, // Link team to creator
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

        // Find team by ID
        const team = await Team.findById(req.params.id);

        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }

        // Authorization: only team creator can add players
        if (team.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized');
        }

        // Check if user exists and is a player
        const user = await User.findById(userId);
        if (!user || user.role !== 'player') {
            res.status(400);
            throw new Error('Invalid user selected or user is not registered as a player');
        }

        // Ensure player profile is verified before adding
        if (!user.isVerified) {
            res.status(400);
            throw new Error('This player has not verified their profile. They must provide all details in their profile page first.');
        }

        // Create Player document using user data
        const player = await Player.create({
            name: user.name,
            role: user.playerRole || 'All-rounder', // Default role
            battingStyle: user.battingStyle || 'Right-hand bat',
            bowlingStyle: user.bowlingStyle || 'None',
            team: team._id,        // Reference to team
            userRef: user._id,     // Reference to original user
            createdBy: req.user.id,
        });

        // Add player reference to team
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
        // Populate players array with full player documents
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
        // Fetch team and populate players
        const team = await Team.findById(req.params.id).populate('players');

        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }

        // Return only players array
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

        // Authorization check: only creator can delete
        if (team.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized to delete this team');
        }

        // Delete all players associated with this team
        await Player.deleteMany({ team: team._id });

        // Delete the team itself
        await team.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: 'Team and associated players deleted'
        });
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