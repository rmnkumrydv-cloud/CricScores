const express = require('express');
const router = express.Router();
const {
    getTeams,
    getMyTeams,
    createTeam,
    addPlayerToTeam,
    getTeamById,
    getTeamPlayers
} = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(getTeams).post(protect, createTeam);
router.get('/my', protect, getMyTeams);
router.route('/:id').get(getTeamById);
router.route('/:id/players')
    .get(getTeamPlayers)
    .post(protect, addPlayerToTeam);

module.exports = router;
