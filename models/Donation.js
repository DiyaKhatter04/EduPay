// Donation Model - For donor offerings
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['laptop', 'books', 'fees', 'bag', 'shoes', 'notes', 'money', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    min: 0,
    required: true
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1
  },
  images: [{
    filename: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['available', 'reserved', 'donated', 'expired'],
    default: 'available'
  },
  matchedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  donatedAt: { type: Date },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on save
donationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
donationSchema.index({ donor: 1, status: 1 });
donationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Donation', donationSchema);
