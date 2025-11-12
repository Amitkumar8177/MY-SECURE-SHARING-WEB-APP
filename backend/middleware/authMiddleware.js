// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { openDb } = require('../config/database');

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;
    console.log('Protect middleware started.');
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token received:', token ? 'Token present' : 'No token');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded:', decoded);

            const db = await openDb();
            req.user = await db.get('SELECT id, username, email, is_admin FROM users WHERE id = ?', [decoded.id]);
            console.log('User fetched from DB:', req.user ? 'User data available' : 'User data NOT available');

            if (!req.user) {
                console.warn('Protect: User not found in DB for decoded ID:', decoded.id);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (err) {
            console.error('Protect: Token verification or DB fetch error:', err);
            // This line might be the cause of 'secretOrPrivateKey must have a value' if JWT_SECRET is bad
            if (err.name === 'JsonWebTokenError' && err.message === 'secret or private key must have a value') {
                return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
            }
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        console.warn('Protect: No token provided in headers.');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware to check if user is admin
const authorizeAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ message: 'Not authorized as an admin' });
    }
    next();
};

module.exports = {
    protect,
    authorizeAdmin
};