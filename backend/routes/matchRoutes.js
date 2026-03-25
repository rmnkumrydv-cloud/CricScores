const express = require('express');
const router = express.Router();
const {
    initializeMatch,
    getMatches,
    getMatchById,
    startMatch,
    recordBall,
    setPlayerOfTheMatch,
    updateCurrentPlayers,
    undoBall,
} = require('../controllers/matchController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.route('/')
    .get(getMatches);

router.post('/initialize', protect, restrictTo('umpire'), initializeMatch);
router.route('/:id').get(getMatchById);
router.put('/:id/start', protect, restrictTo('umpire'), startMatch);
router.put('/:id/players', protect, restrictTo('umpire'), updateCurrentPlayers);
router.post('/:id/ball', protect, restrictTo('umpire'), recordBall);
router.put('/:id/pom', protect, restrictTo('umpire'), setPlayerOfTheMatch);
router.put('/:id/undo', protect, restrictTo('umpire'), undoBall);

module.exports = router;
