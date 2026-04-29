const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  type: {
    type: String,
    enum: ['Room', 'Whole House', 'Studio', 'Other'],
    required: true,
  },
  listingCategory: {
    type: String,
    enum: ['For Rent', 'Sublease'],
    required: true,
  },
  furnished: {
    type: Boolean,
    default: false,
  },
  pricePerMonth: {
    type: Number,
    required: true,
  },
  deposit: {
    type: Number,
    default: 0,
  },
  bedrooms: {
    type: String,
    enum: ['1', '2', '3+'],
    required: true,
  },
  petFriendly: {
    type: Boolean,
    default: false,
  },
  petDeposit: {
    type: Number,
    default: 0,
  },
  utilitiesIncluded: {
    type: Boolean,
    default: false,
  },
  distanceFromSchool: {
    type: String,
    enum: ['1 mile', '3 miles', '5 miles', '10+ miles'],
    required: true,
  },
  parking: {
    type: Boolean,
    default: false,
  },
  photos: {
    type: [String],
    required: true,
    validate: [
      {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: 'At least one photo is required',
      },
    ],
  },
  description: {
    type: String,
    required: true,
  },
  contactPhone: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  accessCode: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Listing', ListingSchema);