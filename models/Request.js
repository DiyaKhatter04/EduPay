// Request Model - For student requirements and donor offerings
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['laptop', 'books', 'fees', 'bag', 'shoes', 'notes', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  amount: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fulfilledAt: { type: Date },
  priority: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
requestSchema.index({ status: 1, createdAt: 1 });
requestSchema.index({ student: 1, status: 1 });

// Auto-update updatedAt on save
requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-update updatedAt on findOneAndUpdate
requestSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Request', requestSchema);
