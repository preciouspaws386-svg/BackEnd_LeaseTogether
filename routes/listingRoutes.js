const express = require('express');
const Listing = require('../models/Listing');
const AccessCode = require('../models/AccessCode');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/listings
// Landlords can post using a valid landlord access code (no full user profile required).
router.post('/', async (req, res) => {
  try {
    const {
      school,
      type,
      listingCategory,
      furnished,
      pricePerMonth,
      deposit,
      bedrooms,
      petFriendly,
      petDeposit,
      utilitiesIncluded,
      distanceFromSchool,
      parking,
      photos,
      description,
      contactPhone,
      accessCode,
    } = req.body || {};

    if (!school || !type || !listingCategory || !pricePerMonth || !bedrooms || !distanceFromSchool || !description || !contactPhone || !accessCode) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify landlord access code
    const codeDoc = await AccessCode.findOne({ code: String(accessCode).trim().toUpperCase(), type: 'landlord' });
    if (!codeDoc || codeDoc.status !== 'active') {
      return res.status(400).json({ message: 'Invalid landlord access code' });
    }

    if (!Array.isArray(photos) || photos.length < 1) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    const listing = await Listing.create({
      postedBy: null,
      school,
      type,
      listingCategory,
      furnished: Boolean(furnished),
      pricePerMonth: Number(pricePerMonth),
      deposit: Number(deposit) || 0,
      bedrooms,
      petFriendly: Boolean(petFriendly),
      petDeposit: Number(petDeposit) || 0,
      utilitiesIncluded: Boolean(utilitiesIncluded),
      distanceFromSchool,
      parking: Boolean(parking),
      photos,
      description,
      contactPhone,
      accessCode,
    });

    return res.status(201).json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/listings
router.get('/', protect, async (req, res) => {
  try {
    const { school, type, minPrice, maxPrice, availability } = req.query;
    let query = {};

    if (school) {
      // Prevent cross-school listing browsing.
      if (!req.user.school) return res.status(400).json({ message: 'School not set' });
      if (String(school) !== String(req.user.school)) {
        return res.status(403).json({ message: 'Cannot browse listings from a different school' });
      }
      query.school = school;
    } else if (req.user.school) {
      query.school = req.user.school;
    }
    if (type) query.type = type;
    if (minPrice) query.pricePerMonth = { ...query.pricePerMonth, $gte: Number(minPrice) };
    if (maxPrice) query.pricePerMonth = { ...query.pricePerMonth, $lte: Number(maxPrice) };
    if (availability === 'available') query.isAvailable = true;

    const listings = await Listing.find(query)
      .populate('school', 'name state')
      .sort({ createdAt: -1 });

    return res.json({ success: true, listings });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// PATCH /api/listings/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (!listing.postedBy || listing.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    const updates = {};
    const allowedFields = [
      'type', 'listingCategory', 'furnished', 'pricePerMonth', 'deposit', 'bedrooms',
      'petFriendly', 'petDeposit', 'utilitiesIncluded', 'distanceFromSchool', 'parking',
      'photos', 'description', 'contactPhone', 'isAvailable'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Listing.findByIdAndUpdate(req.params.id, updates, { new: true });
    return res.json({ success: true, listing: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (!listing.postedBy || listing.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await Listing.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;