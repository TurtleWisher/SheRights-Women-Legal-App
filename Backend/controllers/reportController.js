const db = require('../config/db');

// ─────────────────────────────────────────
// SUBMIT AN INCIDENT REPORT
// POST /api/reports
// Any logged-in user can report
// Anonymous reports save reporter_id as NULL
// ─────────────────────────────────────────
const submitReport = async (req, res) => {
  const {
    issue_category,
    description,
    latitude,
    longitude,
    division,
    district,
    upazila,
    is_anonymous
  } = req.body;

  // These three fields are absolutely required
  // Without coordinates, we can't place the pin on the map
  if (!issue_category || !latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Issue category, latitude and longitude are required'
    });
  }

  // Validate that latitude and longitude are actual numbers
  // Someone could accidentally send a string like "abc" instead of a number
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude must be valid numbers'
    });
  }

  // Validate coordinate ranges
  // Latitude is always between -90 and 90 (south pole to north pole)
  // Longitude is always between -180 and 180 (west to east)
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180'
    });
  }

  // If anonymous, we save NULL instead of the real user_id
  // This is the privacy guarantee — the database literally has no link to the reporter
  const reporter_id = is_anonymous ? null : req.user.user_id;

  const [result] = await db.query(
    `INSERT INTO incident_reports
      (reporter_id, issue_category, description, latitude, longitude,
       division, district, upazila, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reporter_id,
      issue_category,
      description || null,
      latitude,
      longitude,
      division || null,
      district || null,
      upazila || null,
      is_anonymous ? true : false
    ]
  );

  return res.status(201).json({
    status: 'success',
    message: 'Incident reported successfully',
    data: {
      report_id: result.insertId,
      is_anonymous: is_anonymous ? true : false
    }
  });
};


// ─────────────────────────────────────────
// GET ALL REPORTS (ADMIN + HEATMAP DATA)
// GET /api/reports
// Admin only — returns all reports with coordinates
// This is what powers the heatmap on the dashboard
// ─────────────────────────────────────────
const getAllReports = async (req, res) => {
  const {
    division,   // optional filter by division
    district,   // optional filter by district
    category    // optional filter by issue type
  } = req.query;

  // We build the query dynamically based on which filters were sent
  // This lets the admin filter: "show me only Dhaka division reports"
  // or "show me only Child Marriage reports" etc.
  let query = `
    SELECT 
      report_id,
      issue_category,
      description,
      latitude,
      longitude,
      division,
      district,
      upazila,
      is_anonymous,
      status,
      reported_at
    FROM incident_reports
    WHERE 1=1
  `;

  // 1=1 is a trick — it's always true, so we can safely append
  // AND conditions without worrying about whether it's the first filter or not
  const params = [];

  if (division) {
    query += ' AND division = ?';
    params.push(division);
  }

  if (district) {
    query += ' AND district = ?';
    params.push(district);
  }

  if (category) {
    query += ' AND issue_category = ?';
    params.push(category);
  }

  query += ' ORDER BY reported_at DESC';

  const [reports] = await db.query(query, params);

  return res.status(200).json({
    status: 'success',
    count: reports.length,
    data: reports
  });
};


// ─────────────────────────────────────────
// GET MY OWN REPORTS
// GET /api/reports/my
// Citizens see only the reports they personally submitted
// Anonymous reports they made will also appear here
// ─────────────────────────────────────────
const getMyReports = async (req, res) => {
  const user_id = req.user.user_id;

  const [reports] = await db.query(
    `SELECT 
      report_id,
      issue_category,
      description,
      latitude,
      longitude,
      division,
      district,
      upazila,
      is_anonymous,
      status,
      reported_at
    FROM incident_reports
    WHERE reporter_id = ?
    ORDER BY reported_at DESC`,
    [user_id]
  );

  return res.status(200).json({
    status: 'success',
    count: reports.length,
    data: reports
  });
};


// ─────────────────────────────────────────
// UPDATE REPORT STATUS
// PATCH /api/reports/:id/status
// Admin only — verify, refer to authorities etc.
// ─────────────────────────────────────────
const updateReportStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Unverified', 'Verified', 'Referred to Authority'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  // Check that the report actually exists first
  const [reports] = await db.query(
    'SELECT report_id FROM incident_reports WHERE report_id = ?',
    [id]
  );

  if (reports.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Report not found'
    });
  }

  await db.query(
    'UPDATE incident_reports SET status = ? WHERE report_id = ?',
    [status, id]
  );

  return res.status(200).json({
    status: 'success',
    message: 'Report status updated',
    data: { report_id: id, status }
  });
};


module.exports = {
  submitReport,
  getAllReports,
  getMyReports,
  updateReportStatus
};