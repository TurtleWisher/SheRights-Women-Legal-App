const express = require('express');
const router = express.Router();
const {
  getAllModules,
  getModuleById,
  startModule,
  submitQuiz,
  getMyProgress
} = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

// All routes require a valid token
router.use(protect);

// Get all learning modules with personal progress
router.get('/', getAllModules);

// Get personal points and achievement history
router.get('/my-progress', getMyProgress);

// Get one module with its full quiz
router.get('/:id', getModuleById);

// Mark a module as started
router.post('/:id/start', startModule);

// Submit quiz answers and receive score + points
router.post('/:id/submit', submitQuiz);

module.exports = router;