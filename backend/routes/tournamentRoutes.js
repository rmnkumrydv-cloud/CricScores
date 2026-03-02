const express = require('express');
const router = express.Router();
const {
    getTournaments,
    getTournamentById,
    createTournament,
    addTeamToTournament,
    getTournamentStandings,
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTournaments)
    .post(protect, createTournament);

router.route('/:id')
    .get(getTournamentById);

router.route('/:id/teams')
    .post(protect, addTeamToTournament);

router.route('/:id/standings')
    .get(getTournamentStandings);

module.exports = router;
