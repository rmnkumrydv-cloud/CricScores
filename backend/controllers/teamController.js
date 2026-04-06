const Team = require('../models/Team');
const Player = require('../models/Player');
const User = require('../models/User');

/**
 * @desc    Get all teams
 * @route   GET /api/teams
 * @access  Public
 */
const getTeams = async (req, res, next) => {
    try {
        const teams = await Team.find().lean(); // lean() → faster read
        res.status(200).json(teams);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get teams created by logged-in user
 * @route   GET /api/teams/my
 * @access  Private
 */
const getMyTeams = async (req, res, next) => {
    try {
        const teams = await Team.find({ createdBy: req.user.id }).lean();
        res.status(200).json(teams);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 * @access  Private
 */
const createTeam = async (req, res, next) => {
    try {
        const { name, city } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Team name is required' });
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

/**
 * @desc    Add a player to a team
 * @route   POST /api/teams/:id/players
 * @access  Private
 */
const addPlayerToTeam = async (req, res, next) => {
    try {
        const { userId } = req.body;

        const team = await Team.findById(req.params.id);
        if (!team) throw new Error('Team not found');

        // Authorization check
        if (team.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Validate user
        const user = await User.findById(userId);
        if (!user || user.role !== 'player') {
            return res.status(400).json({ message: 'Invalid player user' });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                message: 'Player profile not verified'
            });
        }

        // Prevent duplicate players
        const existingPlayer = await Player.findOne({ userRef: user._id, team: team._id });
        if (existingPlayer) {
            return res.status(400).json({ message: 'Player already exists in this team' });
        }

        // Create player entry
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


/**
 * @desc    Get team details with players
 */
const getTeamById = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id).populate('players');
        if (!team) throw new Error('Team not found');

        res.status(200).json(team);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Get all players of a team
 */
const getTeamPlayers = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id).populate('players');
        if (!team) throw new Error('Team not found');

        res.status(200).json(team.players);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Update team details (name, city, captain)
 */
const updateTeam = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) throw new Error('Team not found');

        if (team.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { name, city, captain } = req.body;

        // Ensure captain belongs to team
        if (captain && !team.players.includes(captain)) {
            return res.status(400).json({
                message: 'Captain must be from the team players'
            });
        }

        const updatedTeam = await Team.findByIdAndUpdate(
            req.params.id,
            { name, city, captain: captain || null },
            { new: true }
        );

        res.status(200).json(updatedTeam);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Remove player from team
 */
const removePlayerFromTeam = async (req, res, next) => {
    try {
        const { id, playerId } = req.params;

        const team = await Team.findById(id);
        if (!team) throw new Error('Team not found');

        if (team.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const index = team.players.indexOf(playerId);
        if (index === -1) {
            return res.status(404).json({ message: 'Player not in team' });
        }

        // Remove player
        team.players.splice(index, 1);

        // Remove captain if needed
        if (team.captain?.toString() === playerId) {
            team.captain = null;
        }

        await team.save();
        await Player.findByIdAndDelete(playerId);

        res.status(200).json({
            id: playerId,
            message: 'Player removed successfully'
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Delete a team
 */
const deleteTeam = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) throw new Error('Team not found');

        if (team.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Prevent deletion if team is used in matches
        const Match = require('../models/Match');
        const matchCount = await Match.countDocuments({
            $or: [
                { 'innings.0.battingTeam': team._id },
                { 'innings.0.bowlingTeam': team._id }
            ]
        });

        if (matchCount > 0) {
            return res.status(400).json({
                message: 'Team is used in matches and cannot be deleted'
            });
        }

        // Delete related players first
        await Player.deleteMany({ team: team._id });

        await team.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: 'Team deleted successfully'
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
    updateTeam,
    removePlayerFromTeam,
    deleteTeam
};
