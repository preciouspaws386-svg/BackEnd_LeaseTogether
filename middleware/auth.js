const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    // Trial: admins and subscribed users bypass; others need active trial window
    if (req.user.role !== 'admin' && !req.user.subscriptionActive) {
      const trialStart = req.user.trialStartDate || req.user.createdAt;
      if (trialStart) {
        const trialMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() > new Date(trialStart).getTime() + trialMs) {
          return res.status(403).json({ message: 'Trial expired', trialExpired: true });
        }
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

module.exports = { protect };
