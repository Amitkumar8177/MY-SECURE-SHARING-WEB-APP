// backend/controllers/adminController.js
const { openDb } = require('../config/database');

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    const db = await openDb();
    try {
        const users = await db.all('SELECT id, username, email, is_admin FROM users');
        // Ensure is_admin is boolean for frontend
        const formattedUsers = users.map(user => ({
            ...user,
            is_admin: user.is_admin === 1
        }));
        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const db = await openDb();

    try {
        // Prevent admin from deleting themselves (optional but good)
        if (req.user.id === parseInt(id)) {
            return res.status(403).json({ message: 'Cannot delete your own admin account through this interface.' });
        }

        // Also delete any files owned by this user
        // This is important to prevent orphaned files or broken links
        await db.run(`DELETE FROM files WHERE user_id = ?`, [id]);
        
        const result = await db.run(`DELETE FROM users WHERE id = ?`, [id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User and their files deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

// @desc    Update user admin status (Admin only)
// @route   PUT /api/admin/users/:id/admin
// @access  Private/Admin
const updateUserAdminStatus = async (req, res) => {
    const { id } = req.params;
    const { is_admin } = req.body; // Expecting boolean true/false

    if (typeof is_admin !== 'boolean') {
        return res.status(400).json({ message: 'Invalid value for is_admin. Must be true or false.' });
    }

    const db = await openDb();
    const is_admin_int = is_admin ? 1 : 0;

    try {
        // Prevent changing admin status of the currently logged-in admin
        if (req.user.id === parseInt(id)) {
            return res.status(403).json({ message: 'Cannot change your own admin status.' });
        }

        const result = await db.run(`UPDATE users SET is_admin = ? WHERE id = ?`, [is_admin_int, id]);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found or admin status already set.' });
        }

        res.status(200).json({ message: `User ID ${id} admin status updated to ${is_admin}.` });
    } catch (error) {
        console.error('Error updating user admin status:', error);
        res.status(500).json({ message: 'Error updating admin status' });
    }
};


module.exports = {
    getAllUsers,
    deleteUser,
    updateUserAdminStatus,
};