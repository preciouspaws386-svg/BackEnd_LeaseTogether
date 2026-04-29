const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  onCampusLocations: [{
    type: String,
    trim: true,
  }],
  offCampusPartners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('School', SchoolSchema);