const express = require('express');
const router = express.Router({ mergeParams: true });
const { uploadEvidence, getCaseEvidence } = require('../controllers/evidenceController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// All evidence routes require authentication
router.use(protect);

// Upload a file as evidence — multer runs first, then the controller
// upload.single('file') means we expect one file with the field name 'file'
router.post('/', upload.single('file'), uploadEvidence);

// Get all evidence files for a specific case
router.get('/', getCaseEvidence);

module.exports = router;