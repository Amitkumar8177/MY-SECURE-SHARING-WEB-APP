// backend/controllers/fileController.js
const { openDb } = require('../config/database');
const path = require('path');
const fs = require('fs/promises'); // Use fs.promises for async file operations
const crypto = require('crypto'); // Still here, though not directly used in unshare

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Helper to ensure uploads directory exists
const ensureUploadsDir = async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create uploads directory:', error);
        throw new Error('Server internal error: Could not create upload directory.');
    }
};

// @desc Upload a new file
// @route POST /api/files/upload
// @access Private
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }

    const uploadedFile = req.file;
    const isPrivate = req.body.is_private === 'true';

    try {
        await ensureUploadsDir();

        const db = await openDb();
        const result = await db.run(
            `INSERT INTO files (user_id, original_name, stored_name, size, is_private, upload_date) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [req.user.id, uploadedFile.originalname, uploadedFile.filename, uploadedFile.size, isPrivate ? 1 : 0]
        );

        res.status(201).json({
            message: 'File uploaded successfully',
            fileId: result.lastID,
            originalName: uploadedFile.originalname,
        });
    } catch (error) {
        console.error('Error uploading file to DB:', error);
        try {
            await fs.unlink(path.join(UPLOADS_DIR, uploadedFile.filename));
            console.warn('Physically uploaded file deleted due to DB error.');
        } catch (unlinkError) {
            console.error('Error deleting physically uploaded file:', unlinkError);
        }
        res.status(500).json({ message: 'Server error during file upload (DB issue)', error: error.message });
    }
};

// @desc Get all files (owned by user or public)
// @route GET /api/files
// @access Private
const getFiles = async (req, res) => {
    try {
        const db = await openDb();
        let files;

        if (!req.user) {
             return res.status(401).json({ message: 'Not authenticated for file retrieval.' });
        }

        if (req.user.is_admin) {
            files = await db.all('SELECT id, user_id, original_name, stored_name, size, is_private, upload_date FROM files');
        } else {
            files = await db.all(
                `SELECT id, user_id, original_name, stored_name, size, is_private, upload_date FROM files
                 WHERE user_id = ? OR is_private = 0`,
                [req.user.id]
            );
        }

        res.status(200).json(files);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Server error fetching files', error: error.message });
    }
};

// @desc Share a private file with another user
// @route POST /api/files/share
// @access Private (Owner of the file)
const shareFile = async (req, res) => {
    const { file_id, shared_with_email } = req.body;

    if (!file_id || !shared_with_email) {
        return res.status(400).json({ message: 'File ID and recipient email are required.' });
    }

    try {
        const db = await openDb();

        // 1. Get the file to be shared
        const file = await db.get('SELECT * FROM files WHERE id = ?', [file_id]);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // 2. Ensure the requesting user owns the file AND it's a private file
        if (file.user_id !== req.user.id || file.is_private !== 1) {
            return res.status(403).json({ message: 'You can only share your own private files.' });
        }

        // 3. Get the ID of the user to share with
        const recipientUser = await db.get('SELECT id FROM users WHERE email = ?', [shared_with_email]);
        if (!recipientUser) {
            return res.status(404).json({ message: 'Recipient user not found.' });
        }

        // 4. Prevent sharing with self
        if (recipientUser.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot share a file with yourself.' });
        }

        // 5. Record the sharing in the shared_files table
        const existingShare = await db.get(
            'SELECT * FROM shared_files WHERE file_id = ? AND shared_with_user_id = ?',
            [file_id, recipientUser.id]
        );
        if (existingShare) {
            return res.status(400).json({ message: 'File already shared with this user.' });
        }

        await db.run(
            'INSERT INTO shared_files (file_id, shared_by_user_id, shared_with_user_id, shared_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [file_id, req.user.id, recipientUser.id]
        );

        res.status(200).json({ message: `File "${file.original_name}" shared successfully with ${shared_with_email}.` });

    } catch (error) {
        console.error('Error sharing file:', error);
        res.status(500).json({ message: 'Server error during file sharing', error: error.message });
    }
};

// @desc Get files shared with the current user
// @route GET /api/files/shared-with-me
// @access Private
const getSharedWithMeFiles = async (req, res) => {
    try {
        const db = await openDb();
        const sharedFiles = await db.all(
            `SELECT
                f.id,
                f.user_id,
                f.original_name,
                f.stored_name,
                f.size,
                f.is_private,
                f.upload_date,
                sf.shared_by_user_id,
                sf.shared_date,
                u.username AS shared_by_username,
                u.email AS shared_by_email
             FROM shared_files sf
             JOIN files f ON sf.file_id = f.id
             JOIN users u ON sf.shared_by_user_id = u.id
             WHERE sf.shared_with_user_id = ?`,
            [req.user.id]
        );
        res.status(200).json(sharedFiles);
    } catch (error) {
        console.error('Error fetching files shared with user:', error);
        res.status(500).json({ message: 'Server error fetching shared files', error: error.message });
    }
};

// @desc Get users a specific file is shared with (for owner to manage sharing)
// @route GET /api/files/:fileId/shared-with
// @access Private (Owner of the file or Admin)
const getSharedWithUsers = async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const db = await openDb();

        const file = await db.get('SELECT user_id FROM files WHERE id = ?', [fileId]);
        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Only the owner or an admin can see who a file is shared with
        if (file.user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to view sharing details for this file.' });
        }

        const sharedUsers = await db.all(
            `SELECT
                sf.id AS share_id,
                u.id AS user_id,
                u.username,
                u.email,
                sf.shared_date
             FROM shared_files sf
             JOIN users u ON sf.shared_with_user_id = u.id
             WHERE sf.file_id = ?`,
            [fileId]
        );
        res.status(200).json(sharedUsers);

    } catch (error) {
        console.error('Error fetching shared users for file:', error);
        res.status(500).json({ message: 'Server error fetching sharing details', error: error.message });
    }
};


// @desc Unshare a file with a specific user
// @route DELETE /api/files/unshare/:shareId
// @access Private (Owner of the file or Admin)
const unshareFile = async (req, res) => {
    const shareId = req.params.shareId; // This is the ID from the shared_files table
    try {
        const db = await openDb();

        // 1. Get the sharing entry
        const shareEntry = await db.get('SELECT * FROM shared_files WHERE id = ?', [shareId]);
        if (!shareEntry) {
            return res.status(404).json({ message: 'Sharing entry not found.' });
        }

        // 2. Get the file details
        const file = await db.get('SELECT user_id, original_name FROM files WHERE id = ?', [shareEntry.file_id]);
        if (!file) {
            return res.status(404).json({ message: 'Associated file not found.' });
        }

        // 3. Authorization: Only the original file owner or an admin can unshare
        if (file.user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to unshare this file.' });
        }

        // 4. Delete the sharing entry
        await db.run('DELETE FROM shared_files WHERE id = ?', [shareId]);

        // Optional: Get recipient's email for a better message
        const recipient = await db.get('SELECT email FROM users WHERE id = ?', [shareEntry.shared_with_user_id]);
        const recipientEmail = recipient ? recipient.email : 'an unknown user';

        res.status(200).json({ message: `File "${file.original_name}" successfully unshared from ${recipientEmail}.` });

    } catch (error) {
        console.error('Error unsharing file:', error);
        res.status(500).json({ message: 'Server error during unsharing', error: error.message });
    }
};


// @desc Download a file
// @route GET /api/files/download/:id
// @access Private
const downloadFile = async (req, res) => {
    const fileId = req.params.id;
    try {
        const db = await openDb();
        const file = await db.get('SELECT * FROM files WHERE id = ?', [fileId]);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        let isAuthorized = false;
        // 1. Check if user owns the file
        if (file.user_id === req.user.id) {
            isAuthorized = true;
        }
        // 2. Check if file is public
        else if (file.is_private === 0) {
            isAuthorized = true;
        }
        // 3. Check if user is admin
        else if (req.user.is_admin) {
            isAuthorized = true;
        }
        // 4. Check if file is shared with the current user
        else {
            const sharedEntry = await db.get(
                'SELECT * FROM shared_files WHERE file_id = ? AND shared_with_user_id = ?',
                [fileId, req.user.id]
            );
            if (sharedEntry) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to download this file.' });
        }

        const filePath = path.join(UPLOADS_DIR, file.stored_name);

        try {
            await fs.access(filePath);
        } catch (accessError) {
            console.error(`Physical file not found for ID ${fileId} at ${filePath}:`, accessError);
            return res.status(500).json({ message: 'The file content is missing on the server.' });
        }

        res.download(filePath, file.original_name);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Server error during file download', error: error.message });
    }
};

// @desc Delete a file
// @route DELETE /api/files/:id
// @access Private (Owner or Admin)
const deleteFile = async (req, res) => {
    const fileId = req.params.id;
    try {
        const db = await openDb();
        const file = await db.get('SELECT * FROM files WHERE id = ?', [fileId]);

        if (!file) {
            return res.status(404).json({ message: 'File not found.' });
        }

        // Only owner or admin can delete
        if (file.user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to delete this file.' });
        }

        const filePath = path.join(UPLOADS_DIR, file.stored_name);

        // Delete from database first (shared_files will also cascade delete due to FOREIGN KEY ON DELETE CASCADE)
        await db.run('DELETE FROM files WHERE id = ?', [fileId]);

        // Then delete physical file
        try {
            await fs.unlink(filePath);
            res.status(200).json({ message: 'File deleted successfully.' });
        } catch (unlinkError) {
            if (unlinkError.code === 'ENOENT') {
                console.warn(`File ${file.stored_name} not found on disk, but deleted from DB.`);
                res.status(200).json({ message: 'File deleted from database (physical file was already missing).' });
            } else {
                console.error('Error deleting physical file:', unlinkError);
                res.status(200).json({ message: 'File deleted from database, but physical file deletion failed.' });
            }
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Server error during file deletion', error: error.message });
    }
};

module.exports = {
    uploadFile,
    getFiles,
    shareFile,
    getSharedWithMeFiles,
    getSharedWithUsers, // <-- NEW EXPORT
    unshareFile,        // <-- NEW EXPORT
    downloadFile,
    deleteFile
};