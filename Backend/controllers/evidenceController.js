const db = require('../config/db');

// ─────────────────────────────────────────
// UPLOAD EVIDENCE TO A CASE
// POST /api/cases/:caseId/evidence
// Multer + Cloudinary handle the actual file upload
// By the time this controller runs, the file is already on Cloudinary
// req.file contains the result from Cloudinary
// ─────────────────────────────────────────
const uploadEvidence = async (req, res) => {
  const { caseId } = req.params;
  const { description } = req.body;
  const user_id = req.user.user_id;

  // Check that a file was actually sent
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  // Verify this case exists and belongs to this citizen
  const [cases] = await db.query(
    'SELECT * FROM cases WHERE case_id = ? AND citizen_id = ?',
    [caseId, user_id]
  );

  if (cases.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Case not found or you do not have permission to add evidence to it'
    });
  }

  // Determine the file type for the database ENUM column
  // req.file.mimetype looks like "image/jpeg" or "application/pdf"
  let file_type = 'Image';
  const mime = req.file.mimetype;

  if (mime.startsWith('image/'))       file_type = 'Image';
  else if (mime === 'application/pdf') file_type = 'PDF';
  else if (mime.startsWith('audio/'))  file_type = 'Audio';
  else if (mime.startsWith('video/'))  file_type = 'Video';

  // req.file.path is the permanent Cloudinary URL
  // This is what we save in the database — not the file itself
  const file_url = req.file.path;

  await db.query(
    `INSERT INTO case_evidences
      (case_id, file_url, file_type, description)
     VALUES (?, ?, ?, ?)`,
    [caseId, file_url, file_type, description || null]
  );

  return res.status(201).json({
    status: 'success',
    message: 'Evidence uploaded successfully',
    data: {
      file_url,
      file_type,
      description: description || null
    }
  });
};


// ─────────────────────────────────────────
// GET ALL EVIDENCE FOR A CASE
// GET /api/cases/:caseId/evidence
// ─────────────────────────────────────────
const getCaseEvidence = async (req, res) => {
  const { caseId } = req.params;
  const { user_id, role } = req.user;

  // Citizens can only view evidence for their own cases
  if (role === 'citizen') {
    const [cases] = await db.query(
      'SELECT case_id FROM cases WHERE case_id = ? AND citizen_id = ?',
      [caseId, user_id]
    );

    if (cases.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this case evidence'
      });
    }
  }

  const [evidences] = await db.query(
    'SELECT * FROM case_evidences WHERE case_id = ? ORDER BY uploaded_at DESC',
    [caseId]
  );

  return res.status(200).json({
    status: 'success',
    count: evidences.length,
    data: evidences
  });
};


module.exports = { uploadEvidence, getCaseEvidence };