const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
const getTournaments = async (req, res, next) => {
    try {
        const { q } = req.query;
        const query = {};
        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }
        const tournaments = await Tournament.find(query);
        res.status(200).json(tournaments);
    } catch (error) {
        next(error);
    }
};

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
const getTournamentById = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('teams');
        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }
        res.status(200).json(tournament);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a tournament
// @route   POST /api/tournaments
// @access  Private
const createTournament = async (req, res, next) => {
    try {
        if (req.user.role !== 'umpire') {
            res.status(403);
            throw new Error('Only umpires can create tournaments');
        }
        const { name, organizer, startDate, endDate, teamIds } = req.body;

        if (!name || !organizer || !startDate || !endDate) {
            res.status(400);
            throw new Error('Please add all required fields');
        }

        const teams = [];
        if (teamIds && teamIds.length > 0) {
            for (const id of teamIds) {
                const team = await Team.findById(id);
                if (team) {
                    teams.push(id);
                }
            }
        }

        const tournament = await Tournament.create({
            name,
            organizer,
            startDate,
            endDate,
            teams,
            createdBy: req.user.id,
        });

        res.status(201).json(tournament);
    } catch (error) {
        next(error);
    }
};

// @desc    Add team to tournament
// @route   POST /api/tournaments/:id/teams
// @access  Private
const addTeamToTournament = async (req, res, next) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        if (tournament.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized');
        }

        // Check if team exists
        const team = await Team.findById(teamId);
        if (!team) {
            res.status(404);
            throw new Error('Team not found');
        }

        // Check if team already in tournament
        if (tournament.teams.includes(teamId)) {
            res.status(400);
            throw new Error('Team already in tournament');
        }

        tournament.teams.push(teamId);
        await tournament.save();

        res.status(200).json(tournament);
    } catch (error) {
        next(error);
    }
};

const getTournamentStandings = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        const matches = await Match.find({ tournamentId: req.params.id, status: 'Completed' });
        const standings = {};

        // Initialize standings with all teams in tournament
        for (const teamId of tournament.teams) {
            const team = await Team.findById(teamId);
            standings[teamId] = {
                teamId,
                name: team.name,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                points: 0,
                nrr: 0
            };
        }

        matches.forEach(match => {
            const team1Id = match.team1.toString();
            const team2Id = match.team2.toString();

            if (standings[team1Id]) standings[team1Id].played += 1;
            if (standings[team2Id]) standings[team2Id].played += 1;

            if (match.winner) {
                const winnerId = match.winner.toString();
                const loserId = winnerId === team1Id ? team2Id : team1Id;

                if (standings[winnerId]) {
                    standings[winnerId].won += 1;
                    standings[winnerId].points += 2;
                }
                if (standings[loserId]) {
                    standings[loserId].lost += 1;
                }
            } else if (match.result === 'Tie') {
                if (standings[team1Id]) {
                    standings[team1Id].tied += 1;
                    standings[team1Id].points += 1;
                }
                if (standings[team2Id]) {
                    standings[team2Id].tied += 1;
                    standings[team2Id].points += 1;
                }
            }
        });

        // Sort by points, then NRR (dummy NRR for now)
        const sortedStandings = Object.values(standings).sort((a, b) => b.points - a.points);

        res.status(200).json(sortedStandings);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a tournament
// @route   DELETE /api/tournaments/:id
// @access  Private
const deleteTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        // Check for user
        if (tournament.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized to delete this tournament');
        }
        
        // Delete tournament
        await tournament.deleteOne();

        res.status(200).json({ id: req.params.id, message: 'Tournament deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTournaments,
    getTournamentById,
    createTournament,
    addTeamToTournament,
    getTournamentStandings,
    deleteTournament
};
