// Admin Controller
const User = require('../models/User');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');

class AdminController {
  // Render admin dashboard
  static async renderDashboard(req, res) {
    try {
      const stats = {
        totalStudents: await User.countDocuments({ role: 'student' }),
        totalDonors: await User.countDocuments({ role: 'donor' }),
        totalScholarships: await Scholarship.countDocuments(),
        pendingApplications: await Application.countDocuments({ status: 'pending' }),
        approvedApplications: await Application.countDocuments({ status: 'approved' }),
        rejectedApplications: await Application.countDocuments({ status: 'rejected' })
      };

      const recentApplications = await Application.find()
        .populate('studentId', 'name email')
        .populate('scholarshipId', 'title amount')
        .sort({ createdAt: -1 })
        .limit(10);

      const recentUsers = await User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .limit(10);

      res.render('admin/dashboard', {
        title: 'Admin Dashboard - EduConnect',
        user: req.user,
        stats,
        recentApplications,
        recentUsers
      });
    } catch (error) {
      console.error('Dashboard Error:', error);
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load dashboard data',
        statusCode: 500
      });
    }
  }

  // Get all users for management
  static async getUsers(req, res) {
    try {
      const { role } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const query = role ? { role } : { role: { $ne: 'admin' } };

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      res.render('admin/users', {
        title: 'User Management - EduConnect',
        users,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        selectedRole: role
      });
    } catch (error) {
      console.error('Get Users Error:', error);
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load users',
        statusCode: 500
      });
    }
  }

  // Approve/reject applications
  static async updateApplicationStatus(req, res) {
    try {
      const { applicationId } = req.params;
      const { status, feedback } = req.body;

      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
      }

      const application = await Application.findByIdAndUpdate(
        applicationId,
        {
          status,
          feedback,
          reviewedAt: new Date(),
          reviewedBy: req.user._id
        },
        { new: true }
      ).populate('studentId scholarshipId');

      if (!application) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      // Emit real-time notification to the student
      if (application?.studentId?._id) {
        req.io.to(`user_${application.studentId._id}`).emit('application-update', {
          applicationId: application._id,
          status,
          scholarshipTitle: application.scholarshipId.title,
          feedback
        });
      }

      res.json({ success: true, application });
    } catch (error) {
      console.error('Update Application Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get scholarship analytics
  static async getAnalytics(req, res) {
    try {
      const scholarshipStats = await Scholarship.aggregate([
        {
          $lookup: {
            from: 'applications',
            localField: '_id',
            foreignField: 'scholarshipId',
            as: 'applications'
          }
        },
        {
          $project: {
            title: 1,
            amount: 1,
            totalApplications: { $size: '$applications' },
            approvedApplications: {
              $size: {
                $filter: {
                  input: '$applications',
                  cond: { $eq: ['$$this.status', 'approved'] }
                }
              }
            }
          }
        }
      ]);

      res.render('admin/analytics', {
        title: 'Analytics - EduConnect',
        scholarshipStats
      });
    } catch (error) {
      console.error('Analytics Error:', error);
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load analytics',
        statusCode: 500
      });
    }
  }
}

module.exports = AdminController;
