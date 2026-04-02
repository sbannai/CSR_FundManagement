const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Role hierarchy
const ROLE_LEVELS = { admin: 4, csr_coordinator: 3, branch_user: 2, donor: 1 };

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user    = await User.findById(payload.id).select('-password');
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'User not found or inactive' });

    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: msg });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (roles.includes(req.user.role)) return next();
    // Check minimum level
    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const minLevel  = Math.min(...roles.map(r => ROLE_LEVELS[r] || 99));
    if (userLevel >= minLevel) return next();
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { authenticate, requireRole };
