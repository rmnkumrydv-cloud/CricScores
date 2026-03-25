const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                return next(new Error('Not authorized, user not found'));
            }

            return next();
        } catch (error) {
            console.log(error);
            res.status(401);
            return next(new Error('Not authorized, token invalid'));
        }
    } else {
        res.status(401);
        return next(new Error('Not authorized, no token'));
    }
};
 
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error(`Role (${req.user.role}) is not authorized to access this resource`));
        }
        next();
    };
};

module.exports = { protect, restrictTo };
