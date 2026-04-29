const mongoose = require('mongoose');

const ApartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
  },
  accessCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
  phoneNumber: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  websiteLink: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Apartment', ApartmentSchema);
