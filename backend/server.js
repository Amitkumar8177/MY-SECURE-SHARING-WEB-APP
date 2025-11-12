// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { openDb } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes'); // New admin routes

const app = express();

// Initialize database
openDb().then(() => {
    console.log('Database initialized.');
}).catch(err => {
    console.error('Failed to initialize database:', err.message);
});

// Middleware
app.use(cors()); // Enables CORS for all origins
app.use(express.json()); // Parses JSON bodies

// Serve static files (uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes); // Use admin routes

// Basic route for testing
app.get('/', (req, res) => {
    res.send('File Sharing App Backend is running!');
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));