const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'donor', 'admin'],
    required: true
  },
 uniqueId: {
  type: String,
  unique: true,
  sparse: true, // allow multiple nulls
  match: [/^\d{4}$/, 'Unique ID must be 4 digits']
},

  studentInfo: {
    fullName: { type: String },
    school: { type: String },
    grade: { type: String },
    requirements: [{
      type: { type: String, enum: ['laptop', 'books', 'fees', 'bag', 'shoes', 'notes', 'other'] },
      description: { type: String },
      status: { type: String, enum: ['pending', 'fulfilled'], default: 'pending' },
      requestedAt: { type: Date, default: Date.now },
      fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fulfilledAt: { type: Date }
    }]
  },
  donorInfo: {
    fullName: { type: String },
    totalDonations: { type: Number, default: 0 },
    isRegularDonor: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Combined pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate unique 4-digit ID for new students/donors
  if (this.isNew && (this.role === 'student' || this.role === 'donor') && !this.uniqueId) {
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const id = Math.floor(1000 + Math.random() * 9000).toString();
      const existingUser = await mongoose.model('User').findOne({ uniqueId: id });
      if (!existingUser) {
        this.uniqueId = id;
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) return next(new Error('Unable to generate unique ID. Please try again.'));
  }

  next();
});

// Auto-update updatedAt on findOneAndUpdate
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find by unique ID
userSchema.statics.findByUniqueId = function(id) {
  return this.findOne({ uniqueId: id });
};

module.exports = mongoose.model('User', userSchema);
