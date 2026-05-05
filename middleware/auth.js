const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Access-code policy:
 * Access codes grant 7 days free trial, then subscription kicks in.
 */
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

const hasValidTrial = (user) => {
  if (!user?.trialActive) return false;
  if (!user?.trialStartDate) return false;
  const startedAt = new Date(user.trialStartDate).getTime();
  if (!Number.isFinite(startedAt)) return false;
  return Date.now() - startedAt < TRIAL_MS;
};

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

    if (req.user.isDisabled && req.user.role !== 'admin') {
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

    if (req.user.isDisabled && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Account disabled' });
    }

    if (req.user.role !== 'admin' && !req.user.subscriptionActive) {
      const trialValid = hasValidTrial(req.user);
      if (req.user.trialActive && !trialValid) {
        await User.findByIdAndUpdate(req.user._id, { trialActive: false });
      }
      if (trialValid) return next();
      return res.status(403).json({
        message: req.user.trialActive ? 'Your trial has ended. Subscription required.' : 'Subscription required',
        subscriptionRequired: true,
        trialExpired: Boolean(req.user.trialActive),
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

module.exports = { protect, authenticate };
