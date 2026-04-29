const express = require('express');
const MeetUp = require('../models/MeetUp');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const twilio = require('twilio');

const router = express.Router();

const twilioClient = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

// POST /api/meetups
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId } = req.body || {};
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });
    if (!receiver.isOpenToRoommate) {
      return res.status(400).json({ message: 'This user is not open to roommates' });
    }
    if (!req.user.school || !receiver.school) {
      return res.status(400).json({ message: 'Users must be in the same school' });
    }
    if (receiver.school.toString() !== req.user.school.toString()) {
      return res.status(400).json({ message: 'Users must be in the same school' });
    }

    const meetup = await MeetUp.create({
      requester: req.user._id,
      receiver: receiverId,
      apartment: req.user.apartment || null,
      apartmentName: req.user.apartmentName || '',
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
      .populate('requester', 'firstName lastInitial school')
      .populate('receiver', 'firstName lastInitial school')
      .sort({ createdAt: -1 });

    // Extra safety: only return same-school meetups (prevents cross-school data leakage).
    const sameSchool = meetups.filter((m) => {
      const requesterSchool = m.requester?.school;
      const receiverSchool = m.receiver?.school;
      return (
        requesterSchool &&
        receiverSchool &&
        requesterSchool.toString() === req.user.school.toString() &&
        receiverSchool.toString() === req.user.school.toString()
      );
    });

    return res.json({ success: true, meetups: sameSchool });
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

    if (action === 'accept') {
      const [requester, receiver] = await Promise.all([
        User.findById(meetup.requester).select('intent school'),
        User.findById(meetup.receiver).select('school'),
      ]);
      if (!requester || !receiver) return res.status(404).json({ message: 'User(s) not found' });
      if (!requester.school || requester.school.toString() !== receiver.school.toString()) {
        return res.status(400).json({ message: 'Users must be in the same school' });
      }

      // Generate confirmation code based on intent code (RM/RS/LT/GM/SM).
      const codePrefix = requester.intent || 'RM';
      const codeSuffix = String(Math.floor(1000 + Math.random() * 9000));
      meetup.confirmationCode = `${codePrefix}-${codeSuffix}`;
    }

    // Extra safety: only allow completion stages inside the same-school match.
    const [requesterUser, receiverUser] = await Promise.all([
      User.findById(meetup.requester).select('school'),
      User.findById(meetup.receiver).select('school'),
    ]);
    if (!requesterUser || !receiverUser) return res.status(404).json({ message: 'User(s) not found' });
    if (!requesterUser.school || requesterUser.school.toString() !== receiverUser.school.toString()) {
      return res.status(400).json({ message: 'Users must be in the same school' });
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

// PATCH /api/meetups/:id/submit-contact
router.patch('/:id/submit-contact', protect, async (req, res) => {
  try {
    const { fullName, phone } = req.body || {};
    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Full name and phone are required' });
    }

    const meetup = await MeetUp.findById(req.params.id);
    if (!meetup) return res.status(404).json({ message: 'Meet-up not found' });
    if (meetup.status !== 'Accepted') {
      return res.status(400).json({ message: 'Meet-up not accepted' });
    }

    const isRequester = meetup.requester.toString() === req.user._id.toString();
    const isReceiver = meetup.receiver.toString() === req.user._id.toString();
    if (!isRequester && !isReceiver) {
      return res.status(403).json({ message: 'Not part of this meet-up' });
    }

    const [requesterUser, receiverUser] = await Promise.all([
      User.findById(meetup.requester).select('school'),
      User.findById(meetup.receiver).select('school'),
    ]);
    if (!requesterUser || !receiverUser) return res.status(404).json({ message: 'User(s) not found' });
    if (!requesterUser.school || requesterUser.school.toString() !== receiverUser.school.toString()) {
      return res.status(400).json({ message: 'Users must be in the same school' });
    }

    if (isRequester) {
      meetup.requesterContact = { fullName, phone };
      meetup.requesterSubmitted = true;
    } else {
      meetup.receiverContact = { fullName, phone };
      meetup.receiverSubmitted = true;
    }

    // Check if both have submitted
    if (meetup.requesterSubmitted && meetup.receiverSubmitted) {
      meetup.status = 'Completed';

      // Send SMS to admin
      try {
        const [requester, receiver] = await Promise.all([
          User.findById(meetup.requester).populate('school', 'name state'),
          User.findById(meetup.receiver).populate('school', 'name state'),
        ]);

        const message = `New Match:
${meetup.requesterContact.fullName} – ${meetup.requesterContact.phone} – ${requester.school.name}
${meetup.receiverContact.fullName} – ${meetup.receiverContact.phone} – ${receiver.school.name}
Confirmation Code: ${meetup.confirmationCode}
Intent: [${requester.intent}]`;

        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.ADMIN_PHONE_NUMBER,
        });
      } catch (smsErr) {
        console.error('SMS send error:', smsErr);
        // Don't fail the request if SMS fails
      }
    }

    await meetup.save();

    const updated = await MeetUp.findById(meetup._id)
      .populate('requester', 'firstName lastInitial')
      .populate('receiver', 'firstName lastInitial');
    return res.json({ success: true, meetup: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
