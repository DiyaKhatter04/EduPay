// Donor Dashboard Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Request = require('../models/Request');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/donations/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Images only! Please upload only JPEG, JPG, PNG, or GIF files.'));
    }
  }
});

// All routes require donor authentication
router.use(authenticateToken);
router.use(requireRole('donor'));

// GET /donor/dashboard - Donor Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const donor = req.user;
    
    // Get student requests sorted by priority and type
    const studentRequests = await Request.find({ status: 'pending' })
      .populate('student', 'uniqueId studentInfo.school studentInfo.grade')
      .sort({ urgencyLevel: -1, createdAt: 1 }); // High urgency first, then first-come-first-serve
    
    // Get donor's own donations
    const myDonations = await Donation.find({ donor: donor._id })
      .populate('recipient', 'uniqueId studentInfo.fullName')
      .sort({ createdAt: -1 });
    
    // Get donor's payments
    const myPayments = await Payment.find({ donor: donor._id })
      .populate('recipient', 'uniqueId studentInfo.fullName')
      .sort({ createdAt: -1 });
    
    // Calculate stats
    const stats = {
      totalDonations: myDonations.length,
      activeDonations: myDonations.filter(d => d.status === 'available').length,
      completedDonations: myDonations.filter(d => d.status === 'donated').length,
      totalPayments: myPayments.reduce((sum, p) => sum + p.amount, 0)
    };

    // Update donor status
    if (stats.totalDonations >= 5 || stats.totalPayments >= 1000) {
      donor.donorInfo.isRegularDonor = true;
      await donor.save();
    }

    res.render('donor/dashboard', {
      title: 'Donor Dashboard - EduConnect',
      donor,
      studentRequests,
      myDonations,
      myPayments,
      stats,
      success: req.query.success,
      error: req.query.error
    });

  } catch (error) {
    console.error('Donor dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load dashboard',
      error
    });
  }
});

// POST /donor/donate - Create new donation offering
router.post('/donate', upload.array('images', 5), async (req, res) => {
  try {
    const { type, description, value, quantity } = req.body;
    
    if (!type || !description || !value) {
      return res.status(400).redirect('/donor/dashboard?error=Please fill in all required fields');
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      path: `/images/donations/${file.filename}`
    })) : [];

    // Create new donation
    const newDonation = new Donation({
      donor: req.user._id,
      type,
      description,
      value: parseFloat(value),
      quantity: parseInt(quantity) || 1,
      images,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
    });

    await newDonation.save();
    
    console.log(`✅ New donation saved to MongoDB:`, {
      donorId: req.user.uniqueId,
      type,
      description,
      value,
      donationId: newDonation._id,
      images: images.length
    });

    // Update donor's total donations
    req.user.donorInfo.totalDonations += 1;
    await req.user.save();

    // Emit real-time notification to students and admin
    if (req.io) {
      const notificationData = {
        donorId: req.user.uniqueId,
        type,
        description,
        value,
        images,
        donationId: newDonation._id,
        createdAt: newDonation.createdAt
      };
      
      req.io.to('student').emit('new-donor-offering', notificationData);
      req.io.to('admin').emit('new-donor-offering', notificationData);
    }

    res.redirect('/donor/dashboard?success=Your donation has been listed successfully!');

  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).redirect('/donor/dashboard?error=Failed to create donation');
  }
});

// POST /donor/payment - Make a payment donation
router.post('/payment', async (req, res) => {
  try {
    const { amount, type, description, recipient } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).redirect('/donor/dashboard?error=Please enter a valid amount');
    }

    // Create new payment
    const newPayment = new Payment({
      donor: req.user._id,
      amount: parseFloat(amount),
      type: type || 'general',
      description,
      recipient: recipient || null, // If specific student, otherwise admin decides
      status: 'pending'
    });

    await newPayment.save();
    
    console.log(`✅ New payment saved to MongoDB:`, {
      donorId: req.user.uniqueId,
      amount,
      type,
      paymentId: newPayment._id
    });

    // Emit notification to admin
    if (req.io) {
      req.io.to('admin').emit('new-payment', {
        donorId: req.user.uniqueId,
        amount,
        type,
        description,
        paymentId: newPayment._id,
        createdAt: newPayment.createdAt
      });
    }

    res.redirect('/donor/dashboard?success=Payment submitted! Admin will process the distribution.');

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).redirect('/donor/dashboard?error=Failed to submit payment');
  }
});

// GET /donor/requests - View student requests by type/priority
router.get('/requests', async (req, res) => {
  try {
    const { type, urgency, sort } = req.query;
    
    let query = { status: 'pending' };
    
    if (type) query.type = type;
    if (urgency) query.urgencyLevel = urgency;
    
    let sortOptions = { createdAt: 1 }; // First-come-first-serve by default
    
    if (sort === 'urgency') {
      sortOptions = { urgencyLevel: -1, createdAt: 1 };
    } else if (sort === 'amount') {
      sortOptions = { amount: -1, createdAt: 1 };
    }
    
    const requests = await Request.find(query)
      .populate('student', 'uniqueId studentInfo.school studentInfo.grade')
      .sort(sortOptions);

    res.render('donor/requests', {
      title: 'Student Requests - EduConnect',
      donor: req.user,
      requests,
      filters: { type, urgency, sort }
    });

  } catch (error) {
    console.error('View requests error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load requests',
      error
    });
  }
});

module.exports = router;