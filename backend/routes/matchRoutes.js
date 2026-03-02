const express = require('express');
const router = express.Router();
const {
    initializeMatch,
    getMatches,
    getMatchById,
    startMatch,
    recordBall,
    setPlayerOfTheMatch,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(getMatches);

router.post('/initialize', protect, initializeMatch);
router.route('/:id').get(getMatchById);
router.put('/:id/start', protect, startMatch);
router.put('/:id/players', protect, updateCurrentPlayers);
router.post('/:id/ball', protect, recordBall);
router.put('/:id/pom', protect, setPlayerOfTheMatch);

module.exports = router;
