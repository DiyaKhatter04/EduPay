// Student Dashboard Routes
const express = require('express');
const User = require('../models/User');
const Request = require('../models/Request');
const Donation = require('../models/Donation');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleCheck');
const router = express.Router();

// All routes require student authentication
router.use(authenticateToken);
router.use(requireRole('student'));

// GET /student/dashboard - Student Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const student = req.user;
    
    // Get student's requests with populated fulfillment info
    const requests = await Request.find({ student: student._id })
      .populate('fulfilledBy', 'donorInfo.fullName uniqueId')
      .sort({ createdAt: -1 });
    
    // Get available donations for notifications
    const availableDonations = await Donation.find({ 
      status: 'available' 
    }).populate('donor', 'donorInfo.fullName uniqueId');
    
    // Calculate stats
    const stats = {
      totalRequests: requests.length,
      pendingRequests: requests.filter(req => req.status === 'pending').length,
      fulfilledRequests: requests.filter(req => req.status === 'fulfilled').length
    };

    res.render('student/dashboard', {
      title: 'Student Dashboard - EduConnect',
      student,
      requests,
      availableDonations,
      stats,
      success: req.query.success,
      error: req.query.error
    });

  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load dashboard',
      error
    });
  }
});

// POST /student/request - Create new requirement request
router.post('/request', async (req, res) => {
  try {
    const { type, description, urgencyLevel, amount } = req.body;
    
    if (!type || !description) {
      return res.status(400).redirect('/student/dashboard?error=Please fill in all required fields');
    }

    // Create new request
    const newRequest = new Request({
      student: req.user._id,
      type,
      description,
      urgencyLevel: urgencyLevel || 'medium',
      amount: amount || 0,
      priority: Date.now() // For first-come-first-serve
    });

    await newRequest.save();
    
    console.log(`✅ New student request saved to MongoDB:`, {
      studentId: req.user.uniqueId,
      type,
      description,
      requestId: newRequest._id
    });

    // Emit real-time notification to donors and admin
    if (req.io) {
      const notificationData = {
        studentId: req.user.uniqueId,
        type,
        description,
        urgencyLevel,
        amount,
        requestId: newRequest._id,
        createdAt: newRequest.createdAt
      };
      
      req.io.to('donor').emit('new-student-request', notificationData);
      req.io.to('admin').emit('new-student-request', notificationData);
    }

    res.redirect('/student/dashboard?success=Your request has been submitted successfully!');

  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).redirect('/student/dashboard?error=Failed to submit request');
  }
});

// POST /student/claim-donation/:donationId - Claim a donation
router.post('/claim-donation/:donationId', async (req, res) => {
  try {
    const donationId = req.params.donationId;
    const student = req.user;

    // Find the donation
    const donation = await Donation.findById(donationId);
    
    if (!donation || donation.status !== 'available') {
      return res.status(400).redirect('/student/dashboard?error=Donation is no longer available');
    }

    // Update donation status (first-come-first-serve)
    donation.status = 'reserved';
    donation.recipient = student._id;
    donation.donatedAt = new Date();
    await donation.save();

    console.log(`✅ Donation claimed and updated in MongoDB:`, {
      donationId: donation._id,
      studentId: student.uniqueId,
      type: donation.type,
      claimedAt: donation.donatedAt
    });

    // Create a corresponding request if none exists
    const existingRequest = await Request.findOne({
      student: student._id,
      type: donation.type,
      status: 'pending'
    });

    if (existingRequest) {
      existingRequest.status = 'fulfilled';
      existingRequest.fulfilledBy = donation.donor;
      existingRequest.fulfilledAt = new Date();
      await existingRequest.save();
    } else {
      // Create new request as fulfilled
      const newRequest = new Request({
        student: student._id,
        type: donation.type,
        description: `Claimed: ${donation.description}`,
        status: 'fulfilled',
        fulfilledBy: donation.donor,
        fulfilledAt: new Date()
      });
      await newRequest.save();
    }

    // Notify admin and donor
    if (req.io) {
      const notificationData = {
        studentId: student.uniqueId,
        donationId: donation._id,
        type: donation.type,
        description: donation.description,
        claimedAt: donation.donatedAt
      };
      
      req.io.to('admin').emit('donation-claimed', notificationData);
      req.io.to(`user_${donation.donor}`).emit('donation-claimed', notificationData);
    }

    res.redirect('/student/dashboard?success=Donation claimed successfully! The donor has been notified.');

  } catch (error) {
    console.error('Claim donation error:', error);
    res.status(500).redirect('/student/dashboard?error=Failed to claim donation');
  }
});

// GET /student/requests - View all student requests
router.get('/requests', async (req, res) => {
  try {
    const requests = await Request.find({ student: req.user._id })
      .populate('fulfilledBy', 'donorInfo.fullName uniqueId')
      .sort({ createdAt: -1 });

    res.render('student/requests', {
      title: 'My Requests - EduConnect',
      student: req.user,
      requests
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