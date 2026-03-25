const express = require('express');
const router = express.Router();
const {
    getTournaments,
    getTournamentById,
    createTournament,
    addTeamToTournament,
    getTournamentStandings,
    deleteTournament,
} = require('../controllers/tournamentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTournaments)
    .post(protect, restrictTo('umpire'), createTournament);

router.route('/:id')
    .get(getTournamentById)
    .delete(protect, restrictTo('umpire'), deleteTournament);

router.route('/:id/teams')
    .post(protect, restrictTo('umpire'), addTeamToTournament);

router.route('/:id/standings')
    .get(getTournamentStandings);

module.exports = router;
