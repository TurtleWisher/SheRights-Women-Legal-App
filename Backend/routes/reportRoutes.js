const express = require('express');
const router = express.Router();
const {
  submitReport,
  getAllReports,
  getMyReports,
  updateReportStatus
} = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes require a valid token
router.use(protect);

// Submit a new incident report — any logged-in user
router.post('/', submitReport);

// Get my own submitted reports
router.get('/my', getMyReports);

// Get all reports with optional filters — admin only, powers the heatmap
router.get('/', restrictTo('admin'), getAllReports);

// Update a report's status — admin only
router.patch('/:id/status', restrictTo('admin'), updateReportStatus);

module.exports = router;