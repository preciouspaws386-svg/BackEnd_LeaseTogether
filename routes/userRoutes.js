const express = require('express');
const User = require('../models/User');
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
    let query = { _id: { $ne: req.user._id } };

    if (currentUser.apartment) {
      query.apartment = currentUser.apartment;
    } else if (currentUser.apartmentName) {
      query.apartmentName = currentUser.apartmentName;
    }

    const users = await User.find(query)
      .select(
        'firstName lastInitial age major bio photos moveInTimeframe intent isOpenToRoommate apartment apartmentName socialVibe weekendPlans energyLevel hobbies'
      )
      .populate('apartment', 'name city state');

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
      'socialVibe',
      'weekendPlans',
      'energyLevel',
      'conflictStyle',
      'personalSpace',
      'lifestylePace',
      'rechargeStyle',
      'roommateValue',
      'dailyRoutine',
      'communicationStyle',
      'hobbies',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
