const express = require('express');
const router = express.Router();
const { getTopBatters, getTopBowlers } = require('../controllers/leaderboardController');

router.get('/batting', getTopBatters);
router.get('/bowling', getTopBowlers);

module.exports = router;
