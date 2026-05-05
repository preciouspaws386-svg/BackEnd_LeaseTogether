const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccessCode = require('../models/AccessCode');
const School = require('../models/School');
const { protect, authenticate } = require('../middleware/auth');

const router = express.Router();
/**
 * Access-code policy:
 * Access codes grant 7 days free trial, then subscription kicks in.
 */

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
      school: user.school,
      campusPreference: user.campusPreference,
      apartment: user.apartment,
      apartmentName: user.apartmentName,
      age: user.age,
      major: user.major,
      bio: user.bio,
      photos: user.photos,
      moveInTimeframe: user.moveInTimeframe,
      intent: user.intent,
      isOpenToRoommate: user.isOpenToRoommate,
      isDisabled: user.isDisabled,
      memberSince: user.memberSince,
      monthlyBudget: user.monthlyBudget,
      roommatePreference: user.roommatePreference,
      lgbtqFriendly: user.lgbtqFriendly,
      religion: user.religion,
      transportation: user.transportation,
      socialMedia: user.socialMedia,
      lifestyleVibes: user.lifestyleVibes,
      livingTogether: user.livingTogether,
      personalityVibe: user.personalityVibe,
      guestsAndVisitors: user.guestsAndVisitors,
      hobbies: user.hobbies,
      yearInSchool: user.yearInSchool,
      trialStartDate: user.trialStartDate,
      trialActive: user.trialActive,
      subscriptionActive: user.subscriptionActive,
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
      accessCode,
      schoolId,
      campusPreference,
      age,
      major,
      bio,
      moveInTimeframe,
      intent,
      monthlyBudget,
      roommatePreference,
      lgbtqFriendly,
      religion,
      transportation,
      socialMedia,
      lifestyleVibes,
      livingTogether,
      personalityVibe,
      guestsAndVisitors,
      hobbies,
      photos,
      yearInSchool,
      signupState,
    } = req.body || {};

    const YEAR_IN_SCHOOL = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];
    const yearNorm = yearInSchool ? String(yearInSchool).trim() : '';
    const yearInSchoolVal = YEAR_IN_SCHOOL.includes(yearNorm) ? yearNorm : undefined;

    if (!firstName || !lastInitial || !email || !password || !accessCode || !schoolId || !campusPreference || !monthlyBudget) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!signupState || !String(signupState).trim()) {
      return res.status(400).json({ message: 'State is required for registration' });
    }

    const ageNum = age === '' || age == null ? undefined : Number(age);
    if (ageNum != null && Number.isFinite(ageNum) && ageNum < 18) {
      return res.status(400).json({ message: 'You must be at least 18 years old' });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ message: 'Email already in use' });

    // Verify access code
    const codeDoc = await AccessCode.findOne({ code: String(accessCode).trim().toUpperCase() });
    if (!codeDoc) return res.status(400).json({ message: 'Invalid access code' });
    if (codeDoc.status !== 'active') return res.status(400).json({ message: 'Access code is not active' });

    if (!['public', 'private'].includes(codeDoc.type)) {
      return res.status(400).json({ message: 'Invalid access code type' });
    }

    if (codeDoc.type === 'private' && !codeDoc.apartmentId) {
      return res.status(400).json({ message: 'Private access code is missing apartment mapping' });
    }

    // Check if public code is already used
    if (codeDoc.type === 'public' && codeDoc.usedBy) {
      return res.status(400).json({ message: 'This access code has already been used' });
    }

    // Verify school exists and belongs to the claimed state (prevents forged schoolId)
    const school = await School.findById(schoolId);
    if (!school) return res.status(400).json({ message: 'Invalid school selection' });
    if (String(school.state).toUpperCase() !== String(signupState).trim().toUpperCase()) {
      return res.status(400).json({ message: 'School does not match selected state' });
    }

    const now = new Date();
    const memberSince = {
      month: now.toLocaleString('default', { month: 'long' }),
      year: now.getFullYear(),
    };

    const photoArr = Array.isArray(photos) ? photos.filter((p) => typeof p === 'string').slice(0, 5) : [];

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastInitial: String(lastInitial).trim().toUpperCase().slice(0, 1),
      email: String(email).toLowerCase().trim(),
      password,
      school: schoolId,
      campusPreference,
      apartment: codeDoc.type === 'private' ? codeDoc.apartmentId : null,
      apartmentName: codeDoc.type === 'private' ? (await require('../models/Apartment').findById(codeDoc.apartmentId))?.name || '' : '',
      age: ageNum,
      major: major || '',
      bio: bio || '',
      photos: photoArr,
      yearInSchool: yearInSchoolVal,
      moveInTimeframe,
      intent,
      monthlyBudget,
      roommatePreference,
      lgbtqFriendly: Boolean(lgbtqFriendly),
      religion,
      transportation: Array.isArray(transportation) ? transportation : [],
      socialMedia: socialMedia || {},
      lifestyleVibes: lifestyleVibes || {},
      livingTogether: livingTogether || {},
      personalityVibe: personalityVibe || {},
      guestsAndVisitors: guestsAndVisitors || {},
      hobbies: hobbies || '',
      memberSince,
      trialStartDate: now,
      trialActive: true,
      subscriptionActive: false,
    });

    // Ensure `user.school` includes name/state for the immediate post-signup UX.
    await user.populate('school', 'name state');

    // Mark public code as used
    if (codeDoc.type === 'public') {
      await AccessCode.findByIdAndUpdate(codeDoc._id, { status: 'used', usedBy: user._id });
    }

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

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password').populate('school', 'name state');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.isDisabled && user.role !== 'admin') {
      return res.status(403).json({ message: 'Account disabled' });
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

// GET /api/auth/me — subscription not required here so the client can restore session on /subscription
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('school', 'name state');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isDisabled && user.role !== 'admin') return res.status(403).json({ message: 'Account disabled' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/auth/verify-code
router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Code is required' });
    const codeDoc = await AccessCode.findOne({ code: String(code).trim().toUpperCase() });
    if (!codeDoc || codeDoc.status !== 'active') {
      return res.status(404).json({ message: 'Invalid access code. Please check with your provider.' });
    }
    return res.json({ success: true, type: codeDoc.type });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/schools
router.get('/schools', async (req, res) => {
  try {
    const { state } = req.query;
    const query = {};
    if (state != null && String(state).trim()) {
      const s = String(state).trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.state = new RegExp(`^${escaped}$`, 'i');
    }
    const schools = await School.find(query).sort({ name: 1 });
    return res.json({ success: true, schools });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
