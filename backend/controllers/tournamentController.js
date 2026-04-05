const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');

// @desc    Get all tournaments (with optional search)
// @route   GET /api/tournaments
// @access  Public
const getTournaments = async (req, res, next) => {
    try {
        const { q } = req.query;

        // Create query object (for search functionality)
        const query = {};

        // If search query exists → perform case-insensitive regex search on name
        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }

        // Fetch tournaments from DB
        const tournaments = await Tournament.find(query);

        res.status(200).json(tournaments);
    } catch (error) {
        next(error);
    }
};

// @desc    Get tournament by ID (with teams populated)
// @route   GET /api/tournaments/:id
// @access  Public
const getTournamentById = async (req, res, next) => {
    try {
        // Find tournament and populate team details
        const tournament = await Tournament.findById(req.params.id).populate('teams');

        // If tournament not found → return 404
        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        res.status(200).json(tournament);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new tournament
// @route   POST /api/tournaments
// @access  Private (only umpire allowed)
const createTournament = async (req, res, next) => {
    try {
        // Authorization check → only umpire can create
        if (req.user.role !== 'umpire') {
            res.status(403);
            throw new Error('Only umpires can create tournaments');
        }

        const { name, organizer, startDate, endDate, teamIds } = req.body;

        // Validate required fields
        if (!name || !organizer || !startDate || !endDate) {
            res.status(400);
            throw new Error('Please add all required fields');
        }

        const teams = [];

        // Validate and add only existing teams
        if (teamIds && teamIds.length > 0) {
            for (const id of teamIds) {
                const team = await Team.findById(id);
                if (team) {
                    teams.push(id);
                }
            }
        }

        // Create tournament document
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

// @desc    Add a team to a tournament
// @route   POST /api/tournaments/:id/teams
// @access  Private (only creator allowed)
const addTeamToTournament = async (req, res, next) => {
    try {
        const { teamId } = req.body;

        // Find tournament
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        // Authorization check → only creator can modify
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

        // Prevent duplicate team entry
        if (tournament.teams.includes(teamId)) {
            res.status(400);
            throw new Error('Team already in tournament');
        }

        // Add team and save
        tournament.teams.push(teamId);
        await tournament.save();

        res.status(200).json(tournament);
    } catch (error) {
        next(error);
    }
};

// @desc    Get tournament standings (points table)
// @route   GET /api/tournaments/:id/standings
// @access  Public
const getTournamentStandings = async (req, res, next) => {
    try {
        // Find tournament
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

<<<<<<< HEAD
        // Fetch only completed matches of this tournament
        const matches = await Match.find({
            tournamentId: req.params.id,
            status: 'Completed'
        });

=======
        const matches = await Match.find({ tournament: req.params.id, status: 'Completed' });
>>>>>>> fce518a (feat: complete light mode integration and UI contrast overhaul)
        const standings = {};

        // Initialize standings for each team
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
                nrr: 0 // Net Run Rate (not calculated yet)
            };
        }

<<<<<<< HEAD
        // Process each match to update standings
=======
        // Helper to count legal balls in an innings
        const getLegalBalls = (inn) => {
            let balls = 0;
            (inn.oversHistory || []).forEach(over => {
                balls += over.balls.filter(b => !b.isExtra || (b.extraType !== 'Wide' && b.extraType !== 'NoBall')).length;
            });
            return balls;
        };

>>>>>>> fce518a (feat: complete light mode integration and UI contrast overhaul)
        matches.forEach(match => {
            if (!match.innings || match.innings.length === 0) return;
            const inn1 = match.innings[0];
            const inn2 = match.innings[1];
            const team1Id = inn1.battingTeam?.toString();
            const team2Id = inn1.bowlingTeam?.toString();

            if (!team1Id || !team2Id) return;

            // Increment matches played
            if (standings[team1Id]) standings[team1Id].played += 1;
            if (standings[team2Id]) standings[team2Id].played += 1;

<<<<<<< HEAD
            // If match has a winner
            if (match.winner) {
                const winnerId = match.winner.toString();
                const loserId = winnerId === team1Id ? team2Id : team1Id;

                if (standings[winnerId]) {
                    standings[winnerId].won += 1;
                    standings[winnerId].points += 2; // 2 points for win
                }

                if (standings[loserId]) {
                    standings[loserId].lost += 1;
                }

            // If match is tied
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

        // Sort standings → highest points first
        const sortedStandings = Object.values(standings)
            .sort((a, b) => b.points - a.points);
=======
            // Accumulate NRR data: runs scored/conceded, overs faced/bowled
            const balls1 = getLegalBalls(inn1) || (match.totalOvers * 6);
            const balls2 = inn2 ? (getLegalBalls(inn2) || (match.totalOvers * 6)) : (match.totalOvers * 6);

            if (standings[team1Id]) {
                standings[team1Id]._runsFor    = (standings[team1Id]._runsFor    || 0) + (inn1.runs || 0);
                standings[team1Id]._ballsFor   = (standings[team1Id]._ballsFor   || 0) + balls1;
                standings[team1Id]._runsAgainst = (standings[team1Id]._runsAgainst || 0) + (inn2?.runs || 0);
                standings[team1Id]._ballsAgainst = (standings[team1Id]._ballsAgainst || 0) + balls2;
            }
            if (standings[team2Id]) {
                standings[team2Id]._runsFor    = (standings[team2Id]._runsFor    || 0) + (inn2?.runs || 0);
                standings[team2Id]._ballsFor   = (standings[team2Id]._ballsFor   || 0) + balls2;
                standings[team2Id]._runsAgainst = (standings[team2Id]._runsAgainst || 0) + (inn1.runs || 0);
                standings[team2Id]._ballsAgainst = (standings[team2Id]._ballsAgainst || 0) + balls1;
            }

            if (match.winner) {
                const winnerId = match.winner.toString();
                const loserId = winnerId === team1Id ? team2Id : team1Id;
                if (standings[winnerId]) { standings[winnerId].won += 1; standings[winnerId].points += 2; }
                if (standings[loserId]) standings[loserId].lost += 1;
            } else if (match.result === 'Tie') {
                if (standings[team1Id]) { standings[team1Id].tied += 1; standings[team1Id].points += 1; }
                if (standings[team2Id]) { standings[team2Id].tied += 1; standings[team2Id].points += 1; }
            }
        });

        // Compute NRR for each team
        Object.values(standings).forEach(team => {
            const rrf = team._ballsFor > 0 ? (team._runsFor / team._ballsFor) * 6 : 0;
            const rra = team._ballsAgainst > 0 ? (team._runsAgainst / team._ballsAgainst) * 6 : 0;
            team.nrr = parseFloat((rrf - rra).toFixed(3));
            // Remove internal accumulator fields
            delete team._runsFor; delete team._ballsFor;
            delete team._runsAgainst; delete team._ballsAgainst;
        });

        // Sort by points desc, then NRR desc
        const sortedStandings = Object.values(standings).sort((a, b) =>
            b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
        );
>>>>>>> fce518a (feat: complete light mode integration and UI contrast overhaul)

        res.status(200).json(sortedStandings);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a tournament
// @route   DELETE /api/tournaments/:id
// @access  Private (only creator allowed)
const deleteTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament) {
            res.status(404);
            throw new Error('Tournament not found');
        }

        // Authorization check → only creator can delete
        if (tournament.createdBy.toString() !== req.user.id) {
            res.status(401);
            throw new Error('User not authorized to delete this tournament');
        }
<<<<<<< HEAD
=======
        
        // Prevent deletion if associated matches exist
        const matchCount = await Match.countDocuments({ tournament: tournament._id });
        if (matchCount > 0) {
            res.status(400);
            throw new Error('Cannot delete tournament: Matches are associated with this tournament');
        }
>>>>>>> fce518a (feat: complete light mode integration and UI contrast overhaul)

        // Delete tournament
        await tournament.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Export all controllers
module.exports = {
    getTournaments,
    getTournamentById,
    createTournament,
    addTeamToTournament,
    getTournamentStandings,
    deleteTournament
};
