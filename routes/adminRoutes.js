const express = require('express');
const Apartment = require('../models/Apartment');
const User = require('../models/User');
const MeetUp = require('../models/MeetUp');
const AccessCode = require('../models/AccessCode');
const School = require('../models/School');
const Listing = require('../models/Listing');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

const router = express.Router();

router.use(protect, adminOnly);

// ============ ACCESS CODES ============

// GET /api/admin/access-codes
router.get('/access-codes', async (req, res) => {
  try {
    const codes = await AccessCode.find({})
      .populate('usedBy', 'firstName lastInitial email')
      .populate('apartmentId', 'name')
      .sort({ createdAt: -1 });
    return res.json({ success: true, codes });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/admin/access-codes (generate public or private code)
router.post('/access-codes', async (req, res) => {
  try {
    const { type, apartmentId, count } = req.body;
    
    if (!type || !['public', 'private'].includes(type)) {
      return res.status(400).json({ message: 'Type must be public or private' });
    }

    if (type === 'private' && !apartmentId) {
      return res.status(400).json({ message: 'Apartment ID required for private codes' });
    }

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const codes = [];
    const numCodes = type === 'public' && count ? Math.min(count, 100) : 1;

    for (let i = 0; i < numCodes; i++) {
      let code = generateCode();
      // Ensure unique
      while (await AccessCode.findOne({ code })) {
        code = generateCode();
      }
      
      const codeDoc = await AccessCode.create({
        code,
        type,
        apartmentId: type === 'private' ? apartmentId : null,
        status: 'active'
      });
      codes.push(codeDoc);
    }

    const populated = await AccessCode.find({ _id: { $in: codes.map(c => c._id) } })
      .populate('apartmentId', 'name');

    return res.status(201).json({ success: true, codes: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/admin/access-codes/:id (toggle status)
router.patch('/access-codes/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['active', 'disabled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const code = await AccessCode.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('usedBy', 'firstName lastInitial email')
      .populate('apartmentId', 'name');
    
    if (!code) return res.status(404).json({ message: 'Code not found' });
    return res.json({ success: true, code });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/admin/access-codes/:id
router.delete('/access-codes/:id', async (req, res) => {
  try {
    await AccessCode.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Code deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ============ SCHOOLS ============

// GET /api/admin/schools
router.get('/schools', async (req, res) => {
  try {
    const schools = await School.find({})
      .populate('offCampusPartners', 'name')
      .sort({ name: 1 });
    
    const withCounts = await Promise.all(
      schools.map(async (s) => {
        const count = await User.countDocuments({ school: s._id });
        return { ...s.toObject(), userCount: count };
      })
    );
    
    return res.json({ success: true, schools: withCounts });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/admin/schools
router.post('/schools', async (req, res) => {
  try {
    const { name, state, onCampusLocations, offCampusPartners } = req.body;
    if (!name || !state) {
      return res.status(400).json({ message: 'Name and state are required' });
    }
    
    const school = await School.create({
      name,
      state,
      onCampusLocations: Array.isArray(onCampusLocations) ? onCampusLocations : [],
      offCampusPartners: Array.isArray(offCampusPartners) ? offCampusPartners : [],
    });
    
    return res.status(201).json({ success: true, school });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PUT /api/admin/schools/:id
router.put('/schools/:id', async (req, res) => {
  try {
    const { name, state, onCampusLocations, offCampusPartners } = req.body;
    const school = await School.findByIdAndUpdate(
      req.params.id,
      { name, state, onCampusLocations, offCampusPartners },
      { new: true, runValidators: true }
    ).populate('offCampusPartners', 'name');
    
    if (!school) return res.status(404).json({ message: 'School not found' });
    return res.json({ success: true, school });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/admin/schools/:id
router.delete('/schools/:id', async (req, res) => {
  try {
    await School.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'School deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ============ LISTINGS ============

// GET /api/admin/listings
router.get('/listings', async (req, res) => {
  try {
    const listings = await Listing.find({})
      .populate('postedBy', 'firstName lastInitial email')
      .populate('school', 'name state')
      .sort({ createdAt: -1 });
    return res.json({ success: true, listings });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/admin/listings/:id/status
router.patch('/listings/:id/status', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const listing = await Listing.findByIdAndUpdate(req.params.id, { isAvailable }, { new: true })
      .populate('postedBy', 'firstName lastInitial')
      .populate('school', 'name state');
    
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    return res.json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ============ APARTMENTS ============
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
    const { name, address, city, state, zipCode, accessCode, phoneNumber, logoUrl, websiteLink } = req.body;
    if (!name || !address || !city || !state || !zipCode || !accessCode) {
      return res.status(400).json({ message: 'All fields including access code are required' });
    }
    const apartment = await Apartment.create({
      name,
      address,
      city,
      state,
      zipCode,
      accessCode,
      phoneNumber: phoneNumber || '',
      logoUrl: logoUrl || '',
      websiteLink: websiteLink || '',
    });
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
    const users = await User.find(query)
      .populate('apartment', 'name city state')
      .populate('school', 'name state')
      .sort({ createdAt: -1 });
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

// ============ USER MANAGEMENT ============

// PATCH /api/admin/users/:id/disable
router.patch('/users/:id/disable', async (req, res) => {
  try {
    const { isDisabled } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isDisabled: Boolean(isDisabled) }, { new: true })
      .populate('school', 'name state')
      .populate('apartment', 'name');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/admin/users/:id/reset-school
router.patch('/users/:id/reset-school', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { school: null, campusPreference: 'No Preference' }, 
      { new: true }
    ).populate('school', 'name state');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
