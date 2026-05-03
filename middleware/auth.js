const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Read JWT and attach user. Does not enforce subscription (used for /auth/me so session can load).
 */
const authenticate = async (req, res, next) => {
  let token;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    if (req.user.isDisabled) {
      return res.status(403).json({ message: 'Account disabled' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

/**
 * Full gate: authenticated + active subscription for residents (admins bypass).
 */
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    if (req.user.isDisabled) {
      return res.status(403).json({ message: 'Account disabled' });
    }

    if (req.user.role !== 'admin' && !req.user.subscriptionActive) {
      return res.status(403).json({
        message: 'Subscription required',
        subscriptionRequired: true,
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

module.exports = { protect, authenticate };
