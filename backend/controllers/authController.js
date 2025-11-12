// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { openDb } = require('../config/database');

// Generate JWT
const generateToken = (id, is_admin) => {
    console.log('JWT_SECRET accessed in generateToken:', process.env.JWT_SECRET ? '***** (secret is present)' : 'undefined or empty');
    if (!process.env.JWT_SECRET) {
        console.error('Error: JWT_SECRET is not defined!');
        throw new Error('JWT_SECRET is not defined. Cannot generate token.');
    }
    return jwt.sign({ id, is_admin }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    const db = await openDb();

    try {
        // Check if user already exists
        const userExists = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const result = await db.run(
            `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
            [username, email, hashedPassword]
        );

        const newUser = {
            id: result.lastID,
            username,
            email,
            is_admin: 0, // Default to false
        };

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                is_admin: newUser.is_admin === 1
            },
            token: generateToken(newUser.id, newUser.is_admin)
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    const db = await openDb();

    try {
        // Check for user email
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                message: 'Logged in successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_admin: user.is_admin === 1
                },
                token: generateToken(user.id, user.is_admin)
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    // req.user is set by the protect middleware (which is now in authMiddleware.js)
    if (req.user) {
        res.json({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            is_admin: req.user.is_admin === 1
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    // REMOVED: protect, authorizeAdmin - they are now in ../middleware/authMiddleware.js
};