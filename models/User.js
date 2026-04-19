const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastInitial: { type: String, required: [true, 'Last initial is required'], maxlength: 1, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null,
  },
  apartmentName: {
    type: String,
    default: '',
  },
  age: {
    type: Number,
    min: 18,
  },
  major: { type: String, default: '' },
  bio: { type: String, default: '' },
  photos: [{ type: String }],
  moveInTimeframe: {
    type: String,
    enum: ['ASAP', 'Within 1 month', '1-3 months', 'Just browsing'],
    default: 'ASAP',
  },
  intent: {
    type: String,
    enum: ['Looking for a Roommate', 'Looking to Swap Rooms', 'Lease Available'],
    default: 'Looking for a Roommate',
  },
  isOpenToRoommate: {
    type: Boolean,
    default: true,
  },
  socialVibe: {
    type: String,
    default: '',
    enum: ['', 'Always outside / social', 'Chill but down for plans', 'Lowkey & selective', 'Homebody 100%'],
  },
  weekendPlans: {
    type: String,
    default: '',
    enum: ['', 'Going out / parties', 'Small hangouts / kickbacks', 'Gaming / Netflix', 'Resetting / catching up'],
  },
  energyLevel: {
    type: String,
    default: '',
    enum: ['', 'High energy', 'Balanced', 'Calm', 'Keep to myself'],
  },
  conflictStyle: {
    type: String,
    default: '',
    enum: ['', 'Say it right away', 'Talk it out calmly', 'Avoid it if possible', 'Need time first'],
  },
  personalSpace: {
    type: String,
    default: '',
    enum: ['', 'I need my space', 'Balanced', "Doesn't matter", 'I like being around people'],
  },
  lifestylePace: {
    type: String,
    default: '',
    enum: ['', 'Always moving', 'Balanced', 'Chill / slow-paced', 'Depends on the week'],
  },
  rechargeStyle: {
    type: String,
    default: '',
    enum: ['', 'Being social', 'Alone time', 'Music / hobbies', 'Sleep'],
  },
  roommateValue: {
    type: String,
    default: '',
    enum: ['', 'Respect', 'Cleanliness', 'Similar lifestyle', 'Peace & quiet'],
  },
  dailyRoutine: {
    type: String,
    default: '',
    enum: ['', 'Structured', 'Balanced', 'Flexible', 'No real routine'],
  },
  communicationStyle: {
    type: String,
    default: '',
    enum: ['', 'Text', 'Call', 'In person', 'Depends on situation'],
  },
  hobbies: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('validate', function (next) {
  if (Array.isArray(this.photos) && this.photos.length > 5) {
    this.photos = this.photos.slice(0, 5);
  }
  if (typeof this.lastInitial === 'string') {
    this.lastInitial = this.lastInitial.trim().toUpperCase().slice(0, 1);
  }
  next();
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
