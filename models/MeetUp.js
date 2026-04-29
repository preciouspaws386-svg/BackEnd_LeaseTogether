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
  confirmationCode: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined', 'Cancelled', 'Completed'],
    default: 'Pending',
  },
  requesterSubmitted: {
    type: Boolean,
    default: false,
  },
  receiverSubmitted: {
    type: Boolean,
    default: false,
  },
  requesterContact: {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  receiverContact: {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MeetUp', MeetUpSchema);
