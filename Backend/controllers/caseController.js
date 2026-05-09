const db = require('../config/db');

// ─────────────────────────────────────────
// FILE A NEW CASE
// POST /api/cases
// Accessible by: citizen only
// ─────────────────────────────────────────
const fileCase = async (req, res) => {
  const { case_category, incident_description, incident_date } = req.body;

  // citizen's user_id comes from the verified JWT token
  const citizen_id = req.user.user_id;

  // Only citizens can file cases
  if (req.user.role !== 'citizen') {
    return res.status(403).json({
      status: 'error',
      message: 'Only citizens can file cases'
    });
  }

  // Required fields check
  if (!case_category || !incident_description) {
    return res.status(400).json({
      status: 'error',
      message: 'Case category and incident description are required'
    });
  }

  const [result] = await db.query(
    `INSERT INTO cases 
      (citizen_id, case_category, incident_description, incident_date, status)
     VALUES (?, ?, ?, ?, 'Draft')`,
    [citizen_id, case_category, incident_description, incident_date || null]
  );

  return res.status(201).json({
    status: 'success',
    message: 'Case filed successfully',
    data: {
      case_id: result.insertId,
      status: 'Draft'
    }
  });
};


// ─────────────────────────────────────────
// GET ALL CASES
// GET /api/cases
// Citizens see only their own cases
// Lawyers/admins see all cases assigned to them
// ─────────────────────────────────────────
const getAllCases = async (req, res) => {
  const { user_id, role } = req.user;

  let query;
  let params;

  if (role === 'citizen') {
    // Citizens only see their own cases
    query = `
      SELECT 
        c.case_id, c.case_category, c.status, 
        c.incident_date, c.filed_at,
        cp.full_name AS citizen_name
      FROM cases c
      JOIN citizen_profiles cp ON c.citizen_id = cp.user_id
      WHERE c.citizen_id = ?
      ORDER BY c.filed_at DESC
    `;
    params = [user_id];
  } else if (role === 'lawyer' || role === 'consultant') {
    // Lawyers see cases assigned to them
    query = `
      SELECT 
        c.case_id, c.case_category, c.status,
        c.incident_date, c.filed_at,
        cp.full_name AS citizen_name
      FROM cases c
      JOIN citizen_profiles cp ON c.citizen_id = cp.user_id
      WHERE c.assigned_expert_id = ?
      ORDER BY c.filed_at DESC
    `;
    params = [user_id];
  } else if (role === 'admin') {
    // Admins see all cases
    query = `
      SELECT 
        c.case_id, c.case_category, c.status,
        c.incident_date, c.filed_at,
        cp.full_name AS citizen_name
      FROM cases c
      JOIN citizen_profiles cp ON c.citizen_id = cp.user_id
      ORDER BY c.filed_at DESC
    `;
    params = [];
  }

  const [cases] = await db.query(query, params);

  return res.status(200).json({
    status: 'success',
    count: cases.length,
    data: cases
  });
};


// ─────────────────────────────────────────
// GET ONE CASE WITH FULL DETAILS
// GET /api/cases/:id
// ─────────────────────────────────────────
const getCaseById = async (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.user;

  // Fetch the case
  const [cases] = await db.query(
    `SELECT c.*, cp.full_name AS citizen_name
     FROM cases c
     JOIN citizen_profiles cp ON c.citizen_id = cp.user_id
     WHERE c.case_id = ?`,
    [id]
  );

  if (cases.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Case not found'
    });
  }

  const caseData = cases[0];

  // Citizens can only view their own cases
  if (role === 'citizen' && caseData.citizen_id !== user_id) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have permission to view this case'
    });
  }

  // Fetch evidence attached to this case
  const [evidences] = await db.query(
    'SELECT * FROM case_evidences WHERE case_id = ?',
    [id]
  );

  // Fetch the tracking timeline of this case
  const [logs] = await db.query(
    `SELECT ctl.*, u.role AS updated_by_role
     FROM case_tracking_logs ctl
     JOIN users u ON ctl.updated_by = u.user_id
     WHERE ctl.case_id = ?
     ORDER BY ctl.updated_at ASC`,
    [id]
  );

  return res.status(200).json({
    status: 'success',
    data: {
      ...caseData,
      evidences,
      tracking_logs: logs
    }
  });
};


// ─────────────────────────────────────────
// UPDATE CASE STATUS
// PATCH /api/cases/:id/status
// Accessible by: lawyer, admin only
// ─────────────────────────────────────────
const updateCaseStatus = async (req, res) => {
  const { id } = req.params;
  const { new_status, remarks } = req.body;
  const updated_by = req.user.user_id;

  const validStatuses = [
    'Draft', 'Submitted', 'Under Review',
    'Lawyer Assigned', 'In Court', 'Resolved', 'Closed'
  ];

  if (!new_status || !validStatuses.includes(new_status)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  // Get the current status before changing it
  const [cases] = await db.query(
    'SELECT status FROM cases WHERE case_id = ?',
    [id]
  );

  if (cases.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Case not found'
    });
  }

  const previous_status = cases[0].status;

  // Update the case status
  await db.query(
    'UPDATE cases SET status = ? WHERE case_id = ?',
    [new_status, id]
  );

  // Record this change in the tracking log
  // This is what builds Amina's timeline so she's never left in the dark
  await db.query(
    `INSERT INTO case_tracking_logs 
      (case_id, updated_by, previous_status, new_status, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [id, updated_by, previous_status, new_status, remarks || null]
  );

  return res.status(200).json({
    status: 'success',
    message: 'Case status updated successfully',
    data: {
      case_id: id,
      previous_status,
      new_status
    }
  });
};


module.exports = { fileCase, getAllCases, getCaseById, updateCaseStatus };