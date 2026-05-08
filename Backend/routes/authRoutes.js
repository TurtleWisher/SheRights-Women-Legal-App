const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// Returns the logged-in user's info — protected, token required
router.get('/me', protect, (req, res) => {
  res.json({
    status: 'success',
    message: 'Token verified',
    data: req.user
  });
});

module.exports = router;