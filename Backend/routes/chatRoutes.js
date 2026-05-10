const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessionMessages,
  getMySessions,
  transferToHuman,
  closeSession
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(protect);

// Create a new chat session
router.post('/session', createSession);

// Get all my sessions with last message preview
router.get('/sessions', getMySessions);

// Get full message history for a session
router.get('/session/:id', getSessionMessages);

// Transfer session from bot to a human expert
router.patch('/session/:id/transfer', transferToHuman);

// Close a session
router.patch('/session/:id/close', closeSession);

module.exports = router;