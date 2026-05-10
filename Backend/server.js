// Core Node.js HTTP module — creates the actual server
// Express alone can't support WebSockets, but the HTTP server can
const http = require('http');

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Socket.io attaches to the HTTP server, not Express directly
const { Server } = require('socket.io');

const db = require('./config/db');

// Route files
const authRoutes      = require('./routes/authRoutes');
const caseRoutes      = require('./routes/caseRoutes');
const evidenceRoutes  = require('./routes/evidenceRoutes');
const learnRoutes     = require('./routes/gamificationRoutes');
const reportRoutes    = require('./routes/reportRoutes');
const chatRoutes      = require('./routes/chatRoutes');

// Step 1: Create the Express application (the waiter)
const app = express();

// Step 2: Create the HTTP server and wrap Express inside it
// Now the building exists — Express works through it
const server = http.createServer(app);

// Step 3: Attach Socket.io to the HTTP server (the building)
// cors here allows the frontend (different port) to connect via sockets
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- REST API ROUTES ---
app.use('/api/auth',                    authRoutes);
app.use('/api/cases',                   caseRoutes);
app.use('/api/cases/:caseId/evidence',  evidenceRoutes);
app.use('/api/learn',                   learnRoutes);
app.use('/api/reports',                 reportRoutes);
app.use('/api/chat',                    chatRoutes);

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'SheRights API is operational',
    version: '1.0.0'
  });
});

// --- DB TEST ---
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() as server_time');
    res.json({
      status: 'success',
      message: 'Database connection established',
      timestamp: rows[0].server_time
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// --- SOCKET.IO LOGIC ---
// We export io so other files can emit events if needed
// For example, an admin controller could emit a notification to all users
io.on('connection', (socket) => {
  // This fires every time a new user connects via Socket.io
  // socket represents that specific user's open connection
  console.log(`Socket connected: ${socket.id}`);

  // EVENT: join_session
  // The client sends this to enter a specific chat room
  // session_id is the chat session they want to join
  // Rooms are Socket.io's way of grouping connections
  // A message sent to room "session_5" only goes to users in that room
  socket.on('join_session', (session_id) => {
    socket.join(`session_${session_id}`);
    console.log(`Socket ${socket.id} joined session_${session_id}`);
  });

  // EVENT: send_message
  // Client sends: { session_id, sender_id, message_text, attachment_url }
  socket.on('send_message', async (data) => {
    const { session_id, sender_id, message_text, attachment_url } = data;

    try {
      // Save the message to the database permanently
      // So even if the other person is offline, they'll see it when they return
      const [result] = await db.query(
        `INSERT INTO chat_messages
          (session_id, sender_id, message_text, attachment_url)
         VALUES (?, ?, ?, ?)`,
        [session_id, sender_id, message_text, attachment_url || null]
      );

      // Build the message object to send back
      const message = {
        message_id:     result.insertId,
        session_id,
        sender_id,
        message_text,
        attachment_url: attachment_url || null,
        sent_at:        new Date()
      };

      // Emit to EVERYONE in this session room — including the sender
      // This way both sides see the message appear simultaneously
      io.to(`session_${session_id}`).emit('receive_message', message);

    } catch (error) {
      // If saving fails, notify only the sender
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // EVENT: disconnect
  // Fires automatically when a user closes the app or loses internet
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- START SERVER ---
// Notice: server.listen not app.listen
// We listen on the HTTP server now, not just Express
// This is what makes Socket.io work alongside Express
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SheRights API is operational on port ${PORT}`);
});

// Export io in case other parts of the app need to emit events
module.exports = { io };