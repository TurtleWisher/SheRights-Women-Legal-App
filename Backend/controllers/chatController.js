const db = require('../config/db');

// ─────────────────────────────────────────
// CREATE A NEW CHAT SESSION
// POST /api/chat/session
// A citizen starts a session — begins with bot, can transfer to human
// ─────────────────────────────────────────
const createSession = async (req, res) => {
  const citizen_id = req.user.user_id;

  // Only citizens can initiate chat sessions
  if (req.user.role !== 'citizen') {
    return res.status(403).json({
      status: 'error',
      message: 'Only citizens can initiate chat sessions'
    });
  }

  // Check if this citizen already has an active session
  // We don't want duplicate open sessions for the same person
  const [existing] = await db.query(
    `SELECT session_id FROM chat_sessions 
     WHERE citizen_id = ? AND status = 'Active'`,
    [citizen_id]
  );

  if (existing.length > 0) {
    return res.status(200).json({
      status: 'success',
      message: 'You already have an active session',
      data: { session_id: existing[0].session_id }
    });
  }

  // Create a new session — starts as bot session by default
  // expert_id is NULL until a human lawyer is assigned
  const [result] = await db.query(
    `INSERT INTO chat_sessions
      (citizen_id, is_bot_session, status)
     VALUES (?, TRUE, 'Active')`,
    [citizen_id]
  );

  return res.status(201).json({
    status: 'success',
    message: 'Chat session created',
    data: {
      session_id: result.insertId,
      is_bot_session: true,
      status: 'Active'
    }
  });
};


// ─────────────────────────────────────────
// GET MESSAGE HISTORY FOR A SESSION
// GET /api/chat/session/:id
// Loads all past messages when a user reopens a chat
// ─────────────────────────────────────────
const getSessionMessages = async (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.user;

  // Verify this session exists
  const [sessions] = await db.query(
    'SELECT * FROM chat_sessions WHERE session_id = ?',
    [id]
  );

  if (sessions.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Session not found'
    });
  }

  const session = sessions[0];

  // Citizens can only view their own sessions
  if (role === 'citizen' && session.citizen_id !== user_id) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have permission to view this session'
    });
  }

  // Load all messages in chronological order
  const [messages] = await db.query(
    `SELECT 
      cm.*,
      u.role AS sender_role
     FROM chat_messages cm
     JOIN users u ON cm.sender_id = u.user_id
     WHERE cm.session_id = ?
     ORDER BY cm.sent_at ASC`,
    [id]
  );

  return res.status(200).json({
    status: 'success',
    data: {
      session,
      messages
    }
  });
};


// ─────────────────────────────────────────
// GET ALL MY SESSIONS
// GET /api/chat/sessions
// Citizens see their own sessions
// Lawyers see sessions assigned to them
// ─────────────────────────────────────────
const getMySessions = async (req, res) => {
  const { user_id, role } = req.user;

  let query;
  let params;

  if (role === 'citizen') {
    query = `
      SELECT cs.*, 
        (SELECT message_text FROM chat_messages 
         WHERE session_id = cs.session_id 
         ORDER BY sent_at DESC LIMIT 1) AS last_message
      FROM chat_sessions cs
      WHERE cs.citizen_id = ?
      ORDER BY cs.started_at DESC
    `;
    params = [user_id];
  } else {
    query = `
      SELECT cs.*,
        (SELECT message_text FROM chat_messages
         WHERE session_id = cs.session_id
         ORDER BY sent_at DESC LIMIT 1) AS last_message
      FROM chat_sessions cs
      WHERE cs.expert_id = ?
      ORDER BY cs.started_at DESC
    `;
    params = [user_id];
  }

  const [sessions] = await db.query(query, params);

  return res.status(200).json({
    status: 'success',
    count: sessions.length,
    data: sessions
  });
};


// ─────────────────────────────────────────
// TRANSFER SESSION TO HUMAN EXPERT
// PATCH /api/chat/session/:id/transfer
// When the bot can't help, connect to a real lawyer
// ─────────────────────────────────────────
const transferToHuman = async (req, res) => {
  const { id } = req.params;
  const { expert_id } = req.body;

  if (!expert_id) {
    return res.status(400).json({
      status: 'error',
      message: 'Expert ID is required'
    });
  }

  // Verify the expert exists and is actually a lawyer or consultant
  const [experts] = await db.query(
    `SELECT user_id FROM users 
     WHERE user_id = ? AND role IN ('lawyer', 'consultant')`,
    [expert_id]
  );

  if (experts.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Expert not found or is not a lawyer/consultant'
    });
  }

  await db.query(
    `UPDATE chat_sessions 
     SET expert_id = ?, is_bot_session = FALSE, status = 'Transferred_to_Human'
     WHERE session_id = ?`,
    [expert_id, id]
  );

  return res.status(200).json({
    status: 'success',
    message: 'Session transferred to human expert',
    data: { session_id: id, expert_id }
  });
};


// ─────────────────────────────────────────
// CLOSE A CHAT SESSION
// PATCH /api/chat/session/:id/close
// ─────────────────────────────────────────
const closeSession = async (req, res) => {
  const { id } = req.params;

  await db.query(
    `UPDATE chat_sessions 
     SET status = 'Closed', ended_at = NOW()
     WHERE session_id = ?`,
    [id]
  );

  return res.status(200).json({
    status: 'success',
    message: 'Chat session closed'
  });
};


module.exports = {
  createSession,
  getSessionMessages,
  getMySessions,
  transferToHuman,
  closeSession
};