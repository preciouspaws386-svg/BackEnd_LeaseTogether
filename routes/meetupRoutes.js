const express = require('express');
const MeetUp = require('../models/MeetUp');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/meetups
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, scheduledDate, scheduledTime, duration } = req.body || {};
    if (!receiverId || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });
    if (!receiver.isOpenToRoommate) {
      return res.status(400).json({ message: 'This user is not open to roommates' });
    }

    const meetup = await MeetUp.create({
      requester: req.user._id,
      receiver: receiverId,
      apartment: req.user.apartment || null,
      apartmentName: req.user.apartmentName || '',
      scheduledDate,
      scheduledTime,
      duration,
    });

    const populated = await MeetUp.findById(meetup._id)
      .populate('requester', 'firstName lastInitial')
      .populate('receiver', 'firstName lastInitial');
    return res.status(201).json({ success: true, meetup: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/meetups/mine
router.get('/mine', protect, async (req, res) => {
  try {
    const meetups = await MeetUp.find({
      $or: [{ requester: req.user._id }, { receiver: req.user._id }],
    })
      .populate('requester', 'firstName lastInitial')
      .populate('receiver', 'firstName lastInitial')
      .sort({ createdAt: -1 });
    return res.json({ success: true, meetups });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/meetups/:id/respond
router.patch('/:id/respond', protect, async (req, res) => {
  try {
    const { action } = req.body || {};
    const meetup = await MeetUp.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meet-up not found' });

    if (meetup.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the receiver can respond' });
    }
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ message: 'Action must be accept or decline' });
    }

    meetup.status = action === 'accept' ? 'Accepted' : 'Declined';
    await meetup.save();

    const updated = await MeetUp.findById(meetup._id)
      .populate('requester', 'firstName lastInitial')
      .populate('receiver', 'firstName lastInitial');
    return res.json({ success: true, meetup: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/meetups/:id/cancel
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const meetup = await MeetUp.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meet-up not found' });
    if (meetup.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the requester can cancel' });
    }
    if (meetup.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending meet-ups can be cancelled' });
    }
    meetup.status = 'Cancelled';
    await meetup.save();
    return res.json({ success: true, meetup });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
