const express = require('express');
const router = express.Router();
const {
  fileCase,
  getAllCases,
  getCaseById,
  updateCaseStatus
} = require('../controllers/caseController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All case routes require a valid token
router.use(protect);

// File a new case — citizens only
router.post('/', restrictTo('citizen'), fileCase);

// Get all cases — role-based filtering happens inside the controller
router.get('/', getAllCases);

// Get one full case with evidence and timeline
router.get('/:id', getCaseById);

// Update case status — lawyers and admins only
router.patch('/:id/status', restrictTo('lawyer', 'admin'), updateCaseStatus);

module.exports = router;