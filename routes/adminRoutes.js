const express = require('express');
const Apartment = require('../models/Apartment');
const User = require('../models/User');
const MeetUp = require('../models/MeetUp');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

const router = express.Router();

router.use(protect, adminOnly);

// GET /api/admin/apartments
router.get('/apartments', async (req, res) => {
  try {
    const apartments = await Apartment.find({});
    const withCounts = await Promise.all(
      apartments.map(async (apt) => {
        const count = await User.countDocuments({ apartment: apt._id });
        return { ...apt.toObject(), userCount: count };
      })
    );
    return res.json({ success: true, apartments: withCounts });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/admin/apartments
router.post('/apartments', async (req, res) => {
  try {
    const { name, address, city, state, zipCode, accessCode } = req.body;
    if (!name || !address || !city || !state || !zipCode || !accessCode) {
      return res.status(400).json({ message: 'All fields including access code are required' });
    }
    const apartment = await Apartment.create({ name, address, city, state, zipCode, accessCode });
    return res.status(201).json({ success: true, apartment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PUT /api/admin/apartments/:id
router.put('/apartments/:id', async (req, res) => {
  try {
    const apt = await Apartment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!apt) return res.status(404).json({ message: 'Apartment not found' });
    return res.json({ success: true, apartment: apt });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/admin/apartments/:id
router.delete('/apartments/:id', async (req, res) => {
  try {
    await Apartment.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Apartment deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    let query = {};
    if (req.query.apartmentId) query.apartment = req.query.apartmentId;
    const users = await User.find(query).populate('apartment', 'name city state').sort({ createdAt: -1 });
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/admin/meetups
router.get('/meetups', async (req, res) => {
  try {
    let query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.apartmentName) query.apartmentName = { $regex: req.query.apartmentName, $options: 'i' };
    if (req.query.code) query.confirmationCode = { $regex: req.query.code, $options: 'i' };

    const meetups = await MeetUp.find(query)
      .populate('requester', 'firstName lastInitial email')
      .populate('receiver', 'firstName lastInitial email')
      .populate('apartment', 'name')
      .sort({ createdAt: -1 });
    return res.json({ success: true, meetups });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/admin/meetups/:id/status
router.patch('/meetups/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['Pending', 'Accepted', 'Declined', 'Cancelled', 'Completed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const meetup = await MeetUp.findByIdAndUpdate(req.params.id, { status }, { new: true });
    return res.json({ success: true, meetup });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
