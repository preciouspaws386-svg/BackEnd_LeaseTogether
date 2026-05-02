const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONTHS_FOR_DISPLAY = { 0: 'January' }; // placeholder; month strings come from server registration

const UserSchema = new mongoose.Schema(
  {
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

    // School & property
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    campusPreference: {
      type: String,
      enum: ['On Campus', 'Off Campus', 'No Preference'],
      default: 'No Preference',
    },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', default: null },
    apartmentName: { type: String, default: '' },

    // Subscription / trial (Roomiez)
    trialStartDate: { type: Date, default: Date.now },
    trialActive: { type: Boolean, default: true },
    subscriptionActive: { type: Boolean, default: false },

    // Profile basics
    age: { type: Number, min: 18 },
    yearInSchool: {
      type: String,
      enum: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'],
    },
    major: { type: String, default: '' },
    bio: { type: String, default: '' },
    photos: [{ type: String }],
    moveInTimeframe: {
      type: String,
      enum: ['ASAP', 'Within 1 month', '1-3 months', 'Just browsing'],
      default: 'ASAP',
    },

    // Intent codes (stored in DB)
    intent: {
      type: String,
      enum: ['RM', 'RS', 'LT', 'GM', 'SM'],
      default: 'RM',
    },
    isOpenToRoommate: { type: Boolean, default: true },
    isDisabled: { type: Boolean, default: false },

    // Auto-set at account creation
    memberSince: {
      month: { type: String, default: '' },
      year: { type: Number, default: 0 },
    },

    monthlyBudget: {
      type: String,
      enum: ['$500–$800', '$800–$1200', '$1200+'],
      default: '$500–$800',
    },
    roommatePreference: {
      type: String,
      enum: ['No preference', 'Male', 'Female'],
      default: 'No preference',
    },
    lgbtqFriendly: { type: Boolean, default: false },
    religion: {
      type: String,
      enum: [
        'No preference',
        'Non-religious / Atheist',
        'Christian',
        'Muslim',
        'Jewish',
        'Hindu',
        'Buddhist',
        'Spiritual',
        'Other',
        'Prefer not to say',
      ],
      default: 'No preference',
    },
    transportation: [
      {
        type: String,
        enum: ['Car', 'Bike', 'Uber/Rideshare', 'Walk', 'Public Transit'],
      },
    ],
    socialMedia: {
      instagram: { type: String, default: '' },
      snapchat: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      facebook: { type: String, default: '' },
      other: { type: String, default: '' },
    },

    // Multi-select questionnaire sections
    lifestyleVibes: {
      partyingFrequency: {
        type: [String],
        enum: ['Every weekend', 'A few times a month', 'Occasionally', 'Not my thing'],
        default: [],
      },
      drinking: {
        type: [String],
        enum: ['No', 'Occasionally', 'Socially', 'Pretty often'],
        default: [],
      },
      smoking: {
        type: [String],
        enum: ['No', 'Occasionally', 'Regularly (outside)', 'Regularly (indoors)'],
        default: [],
      },
      marijuana: {
        type: [String],
        enum: ['No', 'Occasionally', 'Regularly'],
        default: [],
      },
      roommatePartying: {
        type: [String],
        enum: ['Totally fine', 'Occasionally fine', 'Prefer not', 'Not okay'],
        default: [],
      },
      roommateDrinking: {
        type: [String],
        enum: ['Totally fine', 'Occasionally fine', 'Prefer not', 'Not okay'],
        default: [],
      },
      roommateSmoking: {
        type: [String],
        enum: ['Totally fine', 'Only outside', 'Prefer not', 'Not okay'],
        default: [],
      },
      sleepSchedule: {
        type: [String],
        enum: ['In bed before 11pm', 'Midnight–1am', 'After 1am', 'No consistent schedule'],
        default: [],
      },
      homeNoise: {
        type: [String],
        enum: ['Quiet', 'Moderate', 'Music/TV often', 'Loud/active'],
        default: [],
      },
      pets: {
        type: [String],
        enum: ['Have one (dog)', 'Have one (cat)', 'Planning to get one', 'Fine with pets', 'Prefer no pets'],
        default: [],
      },
      overnightGuestsOkay: {
        type: [String],
        enum: ['Totally fine', 'Occasionally', 'Rarely', 'Not comfortable'],
        default: [],
      },
      significantOther: {
        type: [String],
        enum: ['Yes often', 'Sometimes', 'Rarely', 'No'],
        default: [],
      },
    },
    livingTogether: {
      cleanliness: {
        type: [String],
        enum: ['Super clean', 'Pretty clean', 'I try', 'It is what it is'],
        default: [],
      },
      chores: {
        type: [String],
        enum: ['Prefer a schedule', 'Split as needed', "I'll do my part", 'Not a big priority'],
        default: [],
      },
      sharedSpaces: {
        type: [String],
        enum: ['Always clean', 'Usually clean', 'Sometimes messy', "Doesn't matter"],
        default: [],
      },
      foodSharing: {
        type: [String],
        enum: ['Share everything', 'Some shared items', 'Prefer separate', "Don't touch my stuff"],
        default: [],
      },
      cooking: {
        type: [String],
        enum: ['Every day', 'A few times a week', 'Rarely', 'Never'],
        default: [],
      },
      homeTime: {
        type: [String],
        enum: ['Mostly home', 'Balanced', 'In and out', 'Barely there'],
        default: [],
      },
      studyWork: {
        type: [String],
        enum: ['Quiet and focused', 'Music/background noise', 'Flexible', 'Rarely study at home'],
        default: [],
      },
      sharedItems: {
        type: [String],
        enum: ['Totally fine', 'Some sharing', 'Prefer separate', "Doesn't matter"],
        default: [],
      },
      bills: {
        type: [String],
        enum: ['Very responsible / on time', 'Usually on top of it', 'Sometimes late', 'Go with the flow'],
        default: [],
      },
    },
    personalityVibe: {
      socialVibe: {
        type: [String],
        enum: ['Always outside / social', 'Chill but down for plans', 'Lowkey & selective', 'Homebody 100%'],
        default: [],
      },
      weekendPlans: {
        type: [String],
        enum: ['Going out / parties', 'Small hangouts / kickbacks', 'Gaming / Netflix', 'Resetting / catching up'],
        default: [],
      },
      energyLevel: {
        type: [String],
        enum: ['High energy', 'Balanced', 'Calm', 'Keep to myself'],
        default: [],
      },
      conflictStyle: {
        type: [String],
        enum: ['Say it right away', 'Talk it out calmly', 'Avoid if possible', 'Need time first'],
        default: [],
      },
      personalSpace: {
        type: [String],
        enum: ['I need my space', 'Balanced', "Doesn't matter", 'I like being around people'],
        default: [],
      },
      lifestylePace: {
        type: [String],
        enum: ['Always moving', 'Balanced', 'Chill / slow-paced', 'Depends on the week'],
        default: [],
      },
      rechargeStyle: {
        type: [String],
        enum: ['Being social', 'Alone time', 'Music / hobbies', 'Sleep'],
        default: [],
      },
      roommateValue: {
        type: [String],
        enum: ['Respect', 'Cleanliness', 'Similar lifestyle', 'Peace & quiet'],
        default: [],
      },
      dailyRoutine: {
        type: [String],
        enum: ['Structured', 'Balanced', 'Flexible', 'No real routine'],
        default: [],
      },
      communicationStyle: {
        type: [String],
        enum: ['Text', 'Call', 'In person', 'Depends'],
        default: [],
      },
    },
    guestsAndVisitors: {
      guestFrequency: {
        type: [String],
        enum: ['Rarely', 'Occasionally', 'Often'],
        default: [],
      },
      overnightGuests: {
        type: [String],
        enum: ['Never', 'Sometimes', 'Frequently'],
        default: [],
      },
    },

    // Optional free-form hobbies list (kept for compatibility)
    hobbies: { type: String, default: '' },

    lastActive: { type: Date, default: Date.now },
    profileComplete: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

UserSchema.pre('validate', function (next) {
  if (Array.isArray(this.photos) && this.photos.length > 5) {
    this.photos = this.photos.slice(0, 5);
  }
  if (typeof this.lastInitial === 'string') {
    this.lastInitial = this.lastInitial.trim().toUpperCase().slice(0, 1);
  }

  // Ensure defaults for objects expected by the UI.
  if (!this.monthlyBudget) this.monthlyBudget = '$500–$800';
  if (!this.campusPreference) this.campusPreference = 'No Preference';
  if (!Array.isArray(this.transportation)) this.transportation = [];

  if (!this.socialMedia) this.socialMedia = {};
  for (const k of ['instagram', 'snapchat', 'tiktok', 'facebook', 'other']) {
    if (this.socialMedia[k] == null) this.socialMedia[k] = '';
  }

  if (!this.lifestyleVibes) this.lifestyleVibes = {};
  if (!this.livingTogether) this.livingTogether = {};
  if (!this.personalityVibe) this.personalityVibe = {};
  if (!this.guestsAndVisitors) this.guestsAndVisitors = {};

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
