const express = require('express');
const Apartment = require('../models/Apartment');

const router = express.Router();

// GET /api/apartments — public
router.get('/', async (req, res) => {
  try {
    const apartments = await Apartment.find({}).select('name city state');
    return res.json({ success: true, apartments });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/apartments/verify-code — public
router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Code is required' });
    const apartment = await Apartment.findOne({ accessCode: String(code).trim().toUpperCase() }).select(
      'name city state accessCode'
    );
    if (!apartment) {
      return res
        .status(404)
        .json({ message: 'Invalid access code. Please check with your leasing office.' });
    }
    return res.json({ success: true, apartment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
