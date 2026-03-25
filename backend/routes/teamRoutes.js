const express = require('express');
const router = express.Router();
const {
    getTeams,
    getMyTeams,
    createTeam,
    addPlayerToTeam,
    getTeamById,
    getTeamPlayers,
    deleteTeam
} = require('../controllers/teamController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.route('/').get(getTeams).post(protect, restrictTo('umpire'), createTeam);
router.get('/my', protect, getMyTeams);
router.route('/:id').get(getTeamById).delete(protect, deleteTeam);
router.route('/:id/players')
    .get(getTeamPlayers)
    .post(protect, addPlayerToTeam);

module.exports = router;
