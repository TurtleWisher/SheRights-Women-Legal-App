const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────
// REGISTER
// POST /api/auth/register
// ─────────────────────────────────────────
const register = async (req, res) => {

  // Step 1: Pull out what the user sent us
  const {
    phone_number,
    password,
    role,
    full_name,
    date_of_birth,
    division,
    district,
    upazila,
    is_rural,
    // professional fields (optional)
    bar_registration_number,
    organization_name,
    expertise_area
  } = req.body;

  // Step 2: Basic validation — are the required fields present?
  if (!phone_number || !password || !role || !full_name) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number, password, role and full name are required'
    });
  }

  // Step 3: Check if this phone number already has an account
  const [existingUser] = await db.query(
    'SELECT user_id FROM users WHERE phone_number = ?',
    [phone_number]
  );

  if (existingUser.length > 0) {
    return res.status(409).json({
      status: 'error',
      message: 'An account with this phone number already exists'
    });
  }

  // Step 4: Scramble the password before saving
  // The number 10 is the "cost factor" — how many times to scramble
  // Higher = more secure but slower. 10 is the industry standard.
  const password_hash = await bcrypt.hash(password, 10);

  // Step 5: Save the user into the users table
  const [userResult] = await db.query(
    'INSERT INTO users (phone_number, password_hash, role) VALUES (?, ?, ?)',
    [phone_number, password_hash, role]
  );

  // This is the auto-generated user_id MySQL created for this new row
  const newUserId = userResult.insertId;

  // Step 6: Save the profile based on role
  if (role === 'citizen') {
    await db.query(
      `INSERT INTO citizen_profiles 
        (user_id, full_name, date_of_birth, division, district, upazila, is_rural)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newUserId, full_name, date_of_birth, division, district, upazila, is_rural ?? false]
    );
  }

  if (role === 'lawyer' || role === 'consultant') {
    await db.query(
      `INSERT INTO professional_profiles 
        (user_id, full_name, bar_registration_number, organization_name, expertise_area)
       VALUES (?, ?, ?, ?, ?)`,
      [newUserId, full_name, bar_registration_number, organization_name, expertise_area]
    );
  }

  // Step 7: Respond with success
  return res.status(201).json({
    status: 'success',
    message: 'Account created successfully',
    data: {
      user_id: newUserId,
      phone_number,
      role
    }
  });
};


// ─────────────────────────────────────────
// LOGIN
// POST /api/auth/login
// ─────────────────────────────────────────
const login = async (req, res) => {

  const { phone_number, password } = req.body;

  // Step 1: Are both fields present?
  if (!phone_number || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number and password are required'
    });
  }

  // Step 2: Does this phone number exist in the database?
  const [users] = await db.query(
    'SELECT * FROM users WHERE phone_number = ?',
    [phone_number]
  );

  if (users.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'No account found with this phone number'
    });
  }

  const user = users[0];

  // Step 3: Is the account active?
  if (!user.is_active) {
    return res.status(403).json({
      status: 'error',
      message: 'This account has been deactivated'
    });
  }

  // Step 4: Compare the password they sent with the scrambled version
  // bcrypt unscrambles and compares — we never store the real password
  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      status: 'error',
      message: 'Incorrect password'
    });
  }

  // Step 5: Create the JWT membership card
  // We pack the user's id and role into the token
  // JWT_SECRET is a secret key that only our server knows — stored in .env
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Step 6: Send the token back to the user
  return res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      token,
      user: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        role: user.role
      }
    }
  });
};


module.exports = { register, login };