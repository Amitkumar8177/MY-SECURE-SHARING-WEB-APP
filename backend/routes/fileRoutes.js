// backend/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import protect middleware from the middleware directory
const { protect } = require('../middleware/authMiddleware');

// Import file controller functions (including new sharing functions)
const { uploadFile, getFiles, shareFile, getSharedWithMeFiles, getSharedWithUsers, unshareFile, downloadFile, deleteFile } = require('../controllers/fileController');

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Filter to allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|7z|mp4|webm|ogg|mp3|wav|flac|csv|json|xml|pptx|xlsx|ppt|xls/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only common documents, images, and archives are allowed.'), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB file size limit
  fileFilter: fileFilter,
});

// File Management Routes (Protected)
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles); // Get files owned by user or public
router.get('/download/:id', protect, downloadFile);
router.delete('/:id', protect, deleteFile);

// New Sharing Routes (Protected)
router.post('/share', protect, shareFile); // Share a file with another user
router.get('/shared-with-me', protect, getSharedWithMeFiles); // Get files shared with current user

// Route to get list of users a file is shared with (for managing sharing)
router.get('/:fileId/shared-with', protect, getSharedWithUsers); // <-- NEW ROUTE

// Route to unshare a file (delete a sharing entry)
router.delete('/unshare/:shareId', protect, unshareFile); // <-- NEW ROUTE

module.exports = router;