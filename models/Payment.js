// Payment Model - For financial transactions
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['tuition', 'books', 'supplies', 'general', 'emergency'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'distributed', 'cancelled'],
    default: 'pending'
  },
  description: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: { type: Date },
  distributionMethod: {
    type: String,
    enum: ['full', 'split'],
    default: 'full'
  },
  splitAmong: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number }
  }],
  transactionId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Optional: auto-update updatedAt on findOneAndUpdate
paymentSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
