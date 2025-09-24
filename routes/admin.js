// Admin Dashboard Routes
const express = require('express');
const User = require('../models/User');
const Request = require('../models/Request');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /admin/dashboard - Admin Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Get comprehensive statistics
    const [
      totalUsers,
      totalStudents,
      totalDonors,
      pendingRequests,
      fulfilledRequests,
      totalDonations,
      activeDonations,
      pendingPayments,
      totalPaymentAmount
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'donor' }),
      Request.countDocuments({ status: 'pending' }),
      Request.countDocuments({ status: 'fulfilled' }),
      Donation.countDocuments(),
      Donation.countDocuments({ status: 'available' }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Get recent activity
    const recentRequests = await Request.find()
      .populate('student', 'username uniqueId studentInfo.fullName')
      .populate('fulfilledBy', 'username uniqueId donorInfo.fullName')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentDonations = await Donation.find()
      .populate('donor', 'username uniqueId donorInfo.fullName')
      .populate('recipient', 'username uniqueId studentInfo.fullName')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentPayments = await Payment.find()
      .populate('donor', 'username uniqueId donorInfo.fullName')
      .populate('recipient', 'username uniqueId studentInfo.fullName')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get regular donors
    const regularDonors = await User.find({
      role: 'donor',
      'donorInfo.isRegularDonor': true
    }).sort({ 'donorInfo.totalDonations': -1 });

    const stats = {
      totalUsers,
      totalStudents,
      totalDonors,
      pendingRequests,
      fulfilledRequests,
      totalDonations,
      activeDonations,
      pendingPayments,
      totalPaymentAmount: totalPaymentAmount[0]?.total || 0
    };

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - EduConnect',
      admin: req.user,
      stats,
      recentRequests,
      recentDonations,
      recentPayments,
      regularDonors,
      success: req.query.success,
      error: req.query.error
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load admin dashboard',
      error
    });
  }
});

// GET /admin/users - View all users
router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = { role: { $ne: 'admin' } };
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } },
        { 'studentInfo.fullName': { $regex: search, $options: 'i' } },
        { 'donorInfo.fullName': { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    res.render('admin/users', {
      title: 'Manage Users - EduConnect',
      admin: req.user,
      users,
      filters: { role, search }
    });

  } catch (error) {
    console.error('View users error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load users',
      error
    });
  }
});

// GET /admin/payments - Manage payments
router.get('/payments', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const payments = await Payment.find(query)
      .populate('donor', 'username uniqueId donorInfo.fullName')
      .populate('recipient', 'username uniqueId studentInfo.fullName')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 });

    // Get students for payment distribution
    const students = await User.find({ role: 'student' })
      .select('username uniqueId studentInfo.fullName studentInfo.school');

    res.render('admin/payments', {
      title: 'Manage Payments - EduConnect',
      admin: req.user,
      payments,
      students,
      filters: { status }
    });

  } catch (error) {
    console.error('View payments error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load payments',
      error
    });
  }
});

// POST /admin/process-payment/:paymentId - Process a payment
router.post('/process-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, recipient, distributionMethod, splitAmong } = req.body;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).redirect('/admin/payments?error=Payment not found');
    }

    if (action === 'approve') {
      payment.status = 'approved';
      payment.processedBy = req.user._id;
      payment.processedAt = new Date();
      
      if (distributionMethod === 'full' && recipient) {
        payment.recipient = recipient;
        payment.distributionMethod = 'full';
      } else if (distributionMethod === 'split' && splitAmong) {
        payment.distributionMethod = 'split';
        payment.splitAmong = JSON.parse(splitAmong);
      }
      
      await payment.save();
      
      console.log(`✅ Payment processed in MongoDB:`, {
        paymentId: payment._id,
        status: 'approved',
        distributionMethod,
        processedBy: req.user.username
      });

      res.redirect('/admin/payments?success=Payment approved and processed successfully');
      
    } else if (action === 'reject') {
      payment.status = 'cancelled';
      payment.processedBy = req.user._id;
      payment.processedAt = new Date();
      await payment.save();
      
      res.redirect('/admin/payments?success=Payment rejected');
    }

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).redirect('/admin/payments?error=Failed to process payment');
  }
});

// GET /admin/requests - View all student requests
router.get('/requests', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    
    const requests = await Request.find(query)
      .populate('student', 'username uniqueId studentInfo.fullName studentInfo.school')
      .populate('fulfilledBy', 'username uniqueId donorInfo.fullName')
      .sort({ createdAt: -1 });

    res.render('admin/requests', {
      title: 'Student Requests - EduConnect',
      admin: req.user,
      requests,
      filters: { status, type }
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

// GET /admin/donations - View all donations
router.get('/donations', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    
    const donations = await Donation.find(query)
      .populate('donor', 'username uniqueId donorInfo.fullName')
      .populate('recipient', 'username uniqueId studentInfo.fullName')
      .sort({ createdAt: -1 });

    res.render('admin/donations', {
      title: 'Manage Donations - EduConnect',
      admin: req.user,
      donations,
      filters: { status, type }
    });

  } catch (error) {
    console.error('View donations error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load donations',
      error
    });
  }
});

module.exports = router;