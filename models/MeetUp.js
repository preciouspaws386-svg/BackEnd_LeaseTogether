const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const MeetUpSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  scheduledDate: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    enum: ['10 minutes', '15 minutes'],
    required: true,
  },
  location: {
    type: String,
    default: 'Leasing Office / Clubhouse',
  },
  confirmationCode: {
    type: String,
    default: () => `RM-${nanoid(4).toUpperCase()}`,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined', 'Cancelled', 'Completed'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MeetUp', MeetUpSchema);
