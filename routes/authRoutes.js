const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const sendToken = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };

  return res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastInitial: user.lastInitial,
      email: user.email,
      role: user.role,
      apartment: user.apartment,
      apartmentName: user.apartmentName,
      age: user.age,
      major: user.major,
      bio: user.bio,
      photos: user.photos,
      moveInTimeframe: user.moveInTimeframe,
      intent: user.intent,
      isOpenToRoommate: user.isOpenToRoommate,
      socialVibe: user.socialVibe,
      weekendPlans: user.weekendPlans,
      energyLevel: user.energyLevel,
      conflictStyle: user.conflictStyle,
      personalSpace: user.personalSpace,
      lifestylePace: user.lifestylePace,
      rechargeStyle: user.rechargeStyle,
      roommateValue: user.roommateValue,
      dailyRoutine: user.dailyRoutine,
      communicationStyle: user.communicationStyle,
      hobbies: user.hobbies,
    },
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastInitial,
      email,
      password,
      apartmentId,
      apartmentName,
      age,
      major,
      bio,
      moveInTimeframe,
      intent,
      socialVibe,
      weekendPlans,
      energyLevel,
      conflictStyle,
      personalSpace,
      lifestylePace,
      rechargeStyle,
      roommateValue,
      dailyRoutine,
      communicationStyle,
      hobbies,
    } = req.body || {};

    if (!firstName || !lastInitial || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const ageNum = age === '' || age == null ? undefined : Number(age);
    if (ageNum != null && Number.isFinite(ageNum) && ageNum < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old' });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastInitial: String(lastInitial).trim().toUpperCase().slice(0, 1),
      email: String(email).toLowerCase().trim(),
      password,
      apartment: apartmentId || null,
      apartmentName: apartmentName || '',
      age: ageNum == null ? undefined : Number(ageNum),
      major: major || '',
      bio: bio || '',
      moveInTimeframe,
      intent,
      socialVibe,
      weekendPlans,
      energyLevel,
      conflictStyle,
      personalSpace,
      lifestylePace,
      rechargeStyle,
      roommateValue,
      dailyRoutine,
      communicationStyle,
      hobbies: hobbies || '',
    });

    return sendToken(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(400).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password').populate('apartment');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return sendToken(user, 200, res);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', '', { expires: new Date(0), httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  return res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('apartment');
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
