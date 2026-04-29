const express = require('express');
const School = require('../models/School');

const router = express.Router();

// GET /api/schools — public: get all schools
router.get('/', async (req, res) => {
  try {
    const { state } = req.query;
    let query = {};
    if (state) query.state = state;
    
    const schools = await School.find(query).sort({ name: 1 });
    return res.json({ success: true, schools });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/schools/states — public: get all unique states
router.get('/states', async (req, res) => {
  try {
    const states = await School.distinct('state');
    return res.json({ success: true, states: states.sort() });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /api/schools/:id — public: get single school
router.get('/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
      .populate('offCampusPartners', 'name address city state');
    if (!school) return res.status(404).json({ message: 'School not found' });
    return res.json({ success: true, school });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;