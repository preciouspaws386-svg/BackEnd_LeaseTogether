const express = require('express');
const User = require('../models/User');
const School = require('../models/School');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/users/photos
router.post('/photos', protect, async (req, res) => {
  try {
    const photos = req.body?.photos;
    if (!Array.isArray(photos)) {
      return res.status(400).json({ message: 'photos must be an array' });
    }
    if (photos.length < 1) {
      return res.status(400).json({ message: 'Please upload at least 1 photo' });
    }
    if (photos.length > 5) {
      return res.status(400).json({ message: 'You can upload up to 5 photos' });
    }
    if (!photos.every((p) => typeof p === 'string' && p.startsWith('data:image/'))) {
      return res.status(400).json({ message: 'Photos must be base64-encoded image strings' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { photos: photos.slice(0, 5) },
      { new: true, runValidators: true }
    );
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/users/community
router.get('/community', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.school) {
      return res.status(400).json({ message: 'School not set' });
    }

    const query = {
      _id: { $ne: req.user._id },
      school: currentUser.school,
      isDisabled: { $ne: true },
    };

    const users = await User.find(query)
      .select(
        'firstName lastInitial age yearInSchool major bio photos moveInTimeframe intent isOpenToRoommate school campusPreference memberSince socialMedia lgbtqFriendly transportation hobbies monthlyBudget roommatePreference personalityVibe lifestyleVibes apartmentName'
      )
      .populate('school', 'name state');

    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/users/status
router.patch('/status', protect, async (req, res) => {
  try {
    const { isOpenToRoommate } = req.body || {};
    const user = await User.findByIdAndUpdate(req.user._id, { isOpenToRoommate }, { new: true });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/users/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const allowedFields = [
      'firstName',
      'lastInitial',
      'age',
      'major',
      'bio',
      'moveInTimeframe',
      'intent',
      'monthlyBudget',
      'roommatePreference',
      'lgbtqFriendly',
      'religion',
      'transportation',
      'socialMedia',
      'lifestyleVibes',
      'livingTogether',
      'personalityVibe',
      'guestsAndVisitors',
      'hobbies',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const yearOpts = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];
    let unsetYear = false;
    if (req.body.yearInSchool !== undefined) {
      const v = req.body.yearInSchool;
      if (v === '' || v === null) {
        unsetYear = true;
      } else if (yearOpts.includes(String(v).trim())) {
        updates.yearInSchool = String(v).trim();
      }
    }

    const mongoOp = {};
    if (Object.keys(updates).length) mongoOp.$set = updates;
    if (unsetYear) mongoOp.$unset = { yearInSchool: '' };

    const user =
      Object.keys(mongoOp).length === 0
        ? await User.findById(req.user._id)
        : await User.findByIdAndUpdate(req.user._id, mongoOp, { new: true, runValidators: true });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/users/school
// Allows (re-)selecting school/campusPreference only when user.school is not set (admin reset flow).
router.patch('/school', protect, async (req, res) => {
  try {
    const { schoolId, campusPreference } = req.body || {};
    if (!schoolId || !campusPreference) {
      return res.status(400).json({ message: 'schoolId and campusPreference are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.school) {
      return res.status(403).json({ message: 'School already set; cannot be changed' });
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(400).json({ message: 'Invalid school selection' });

    user.school = schoolId;
    user.campusPreference = campusPreference;
    await user.save();

    const populated = await User.findById(user._id).populate('school', 'name state');
    return res.json({ success: true, user: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
