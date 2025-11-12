// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
const { getAllUsers, deleteUser, updateUserAdminStatus } = require('../controllers/adminController');

// All routes in this file will first go through 'protect' then 'authorizeAdmin' middleware
router.use(protect);
router.use(authorizeAdmin);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/admin', updateUserAdminStatus); // To set/unset admin status for a user

module.exports = router;