const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {

  // Step 1: Grab the token from the request headers
  // Every protected request must send the token in the Authorization header
  // The format is always: "Bearer eyJhbGc..."
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Step 2: If no token was sent at all, block immediately
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.'
    });
  }

  // Step 3: Verify the token is genuine and not expired
  // If someone forges a token or it expired, jwt.verify throws an error
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired token.'
      });
    }

    // Step 4: Token is valid — attach the decoded user info to the request
    // Now every controller that comes after can access req.user
    // to know exactly who is making this request
    req.user = decoded;

    // Step 5: Call next() — let the request continue to the controller
    next();
  });
};

// Role-based guard — restrict certain routes to specific roles only
// Usage: restrictTo('admin', 'lawyer')
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };