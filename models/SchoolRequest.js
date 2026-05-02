const mongoose = require('mongoose');

const SchoolRequestSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
  },
  userEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SchoolRequest', SchoolRequestSchema);
