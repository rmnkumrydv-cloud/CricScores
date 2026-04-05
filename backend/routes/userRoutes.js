const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    getUmpires,
    getPlayers,
    updateUserProfile,
    getUserStats,
    getPlayerStats,
    getUser
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/me/stats', protect, getUserStats);
router.put('/profile', protect, updateUserProfile);
router.get('/umpires', getUmpires);
router.get('/players', getPlayers);
router.get('/:id/stats', getPlayerStats);
router.get('/:id', getUser);

module.exports = router;
