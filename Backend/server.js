// Bringing in our tools
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Bringing in our pantry connection
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes'); // with other requires
const reportRoutes = require('./routes/reportRoutes');
// Creating the kitchen (the Express application)
const app = express();

// --- KITCHEN POLICIES (Middleware) ---

// Policy 1: Allow the dining room (frontend) to send orders here
// Without this, the browser would BLOCK requests from a different address
app.use(cors());

// Policy 2: The kitchen can read JSON order tickets
// Without this, Express can't understand the data sent from the frontend
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/learn', gamificationRoutes);
app.use('/api/reports', reportRoutes);

// --- HEALTH CHECK ROUTE ---
// This is a simple test: is the kitchen open and running?
// Like knocking on the kitchen door to see if anyone is inside
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'SheRights API is operational',
    status: 'running'
  });
});

// --- DATABASE CONNECTION TEST ROUTE ---
// This knocks on the pantry door to check if it responds
app.get('/api/db-test', async (req, res) => {
  try {
    // We send a tiny test question to MySQL: "what time is it?"
    // If MySQL answers, the connection works
const [rows] = await db.query('SELECT NOW() as server_time');
    res.json({
      message: 'Database is connected!',
      time: rows[0].server_time
    });
  } catch (error) {
    // If something goes wrong, we report the error
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// --- START THE KITCHEN ---
// We tell the kitchen: listen on port 5000 for incoming orders
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SheRights is running on port ${PORT}`);
});