const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');

/**
 * @desc    Get all tournaments (with optional search)
 * @route   GET /api/tournaments
 * @access  Public
 */
const getTournaments = async (req, res, next) => {
    try {
        const { q } = req.query;

        const query = {};

        // Case-insensitive search on tournament name
        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }

        const tournaments = await Tournament.find(query).lean();

        res.status(200).json(tournaments);
    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Get tournament by ID (with teams)
 */
const getTournamentById = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('teams')
            .lean();

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        res.status(200).json(tournament);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Create a new tournament
 * @access  Private (Umpire only)
 */
const createTournament = async (req, res, next) => {
    try {
        if (req.user.role !== 'umpire') {
            return res.status(403).json({ message: 'Only umpires can create tournaments' });
        }

        const { name, organizer, startDate, endDate, teamIds = [] } = req.body;

        if (!name || !organizer || !startDate || !endDate) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        /**
         * Validate team IDs in parallel (better than loop)
         */
        const validTeams = await Team.find({ _id: { $in: teamIds } }).select('_id');

        const tournament = await Tournament.create({
            name,
            organizer,
            startDate,
            endDate,
            teams: validTeams.map(t => t._id),
            createdBy: req.user.id,
        });

        res.status(201).json(tournament);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Add team to tournament
 */
const addTeamToTournament = async (req, res, next) => {
    try {
        const { teamId } = req.body;

        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) throw new Error('Tournament not found');

        if (tournament.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        if (tournament.teams.includes(teamId)) {
            return res.status(400).json({ message: 'Team already exists' });
        }

        tournament.teams.push(teamId);
        await tournament.save();

        res.status(200).json(tournament);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Get tournament standings (Points Table + NRR)
 */
const getTournamentStandings = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) throw new Error('Tournament not found');

        const matches = await Match.find({
            tournament: req.params.id,
            status: 'Completed'
        });

        const standings = {};

        /**
         * STEP 1: Initialize teams
         */
        const teams = await Team.find({ _id: { $in: tournament.teams } }).lean();

        teams.forEach(team => {
            standings[team._id] = {
                teamId: team._id,
                name: team.name,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                points: 0,
                nrr: 0,

                // Internal accumulators
                _runsFor: 0,
                _runsAgainst: 0,
                _ballsFor: 0,
                _ballsAgainst: 0
            };
        });

        /**
         * Helper: count legal balls
         */
        const getLegalBalls = (inn) =>
            (inn?.oversHistory || []).reduce((acc, over) =>
                acc + over.balls.filter(b =>
                    !b.isExtra || !['Wide', 'NoBall'].includes(b.extraType)
                ).length, 0
            );

        /**
         * STEP 2: Process matches
         */
        matches.forEach(match => {
            const [inn1, inn2] = match.innings || [];

            if (!inn1 || !inn2) return;

            const team1Id = inn1.battingTeam?.toString();
            const team2Id = inn1.bowlingTeam?.toString();

            if (!standings[team1Id] || !standings[team2Id]) return;

            standings[team1Id].played++;
            standings[team2Id].played++;

            const balls1 = getLegalBalls(inn1) || match.totalOvers * 6;
            const balls2 = getLegalBalls(inn2) || match.totalOvers * 6;

            // Update stats
            standings[team1Id]._runsFor += inn1.runs || 0;
            standings[team1Id]._runsAgainst += inn2.runs || 0;
            standings[team1Id]._ballsFor += balls1;
            standings[team1Id]._ballsAgainst += balls2;

            standings[team2Id]._runsFor += inn2.runs || 0;
            standings[team2Id]._runsAgainst += inn1.runs || 0;
            standings[team2Id]._ballsFor += balls2;
            standings[team2Id]._ballsAgainst += balls1;

            // Result logic
            if (match.winner) {
                const winner = match.winner.toString();
                const loser = winner === team1Id ? team2Id : team1Id;

                standings[winner].won++;
                standings[winner].points += 2;
                standings[loser].lost++;
            } else if (match.result === 'Tie') {
                standings[team1Id].tied++;
                standings[team2Id].tied++;
                standings[team1Id].points++;
                standings[team2Id].points++;
            }
        });

        /**
         * STEP 3: Calculate NRR
         */
        Object.values(standings).forEach(team => {
            const runRateFor = team._ballsFor ? (team._runsFor / team._ballsFor) * 6 : 0;
            const runRateAgainst = team._ballsAgainst ? (team._runsAgainst / team._ballsAgainst) * 6 : 0;

            team.nrr = +(runRateFor - runRateAgainst).toFixed(3);

            delete team._runsFor;
            delete team._runsAgainst;
            delete team._ballsFor;
            delete team._ballsAgainst;
        });

        /**
         * STEP 4: Sort standings
         */
        const sorted = Object.values(standings).sort(
            (a, b) => b.points - a.points || b.nrr - a.nrr
        );

        res.status(200).json(sorted);

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Delete tournament
 */
const deleteTournament = async (req, res, next) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) throw new Error('Tournament not found');

        if (tournament.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Prevent deletion if matches exist
        const matchCount = await Match.countDocuments({ tournament: tournament._id });
        if (matchCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete: matches exist'
            });
        }

        await tournament.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: 'Tournament deleted successfully'
        });

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
