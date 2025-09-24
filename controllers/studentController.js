// Student Controller
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const User = require('../models/User');

class StudentController {
  // Render student dashboard
  static async renderDashboard(req, res) {
    try {
      const studentId = req.user._id;
      
      const stats = {
        appliedScholarships: await Application.countDocuments({ studentId }),
        pendingApplications: await Application.countDocuments({ 
          studentId, 
          status: 'pending' 
        }),
        approvedApplications: await Application.countDocuments({ 
          studentId, 
          status: 'approved' 
        }),
        totalAwarded: await Application.aggregate([
          { 
            $match: { 
              studentId: studentId, 
              status: 'approved' 
            } 
          },
          {
            $lookup: {
              from: 'scholarships',
              localField: 'scholarshipId',
              foreignField: '_id',
              as: 'scholarship'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $arrayElemAt: ['$scholarship.amount', 0] } }
            }
          }
        ]).then(result => result[0]?.total || 0)
      };

      const myApplications = await Application.find({ studentId })
        .populate('scholarshipId', 'title amount deadline')
        .sort({ createdAt: -1 })
        .limit(5);

      const availableScholarships = await Scholarship.find({
        status: 'active',
        deadline: { $gt: new Date() },
        _id: { 
          $nin: await Application.find({ studentId }).distinct('scholarshipId')
        }
      })
        .populate('donorId', 'name')
        .sort({ createdAt: -1 })
        .limit(6);

      res.render('student/dashboard', {
        title: 'Student Dashboard - EduConnect',
        user: req.user,
        stats,
        myApplications,
        availableScholarships
      });
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load dashboard data',
        statusCode: 500
      });
    }
  }

  // Browse available scholarships
  static async browseScholarships(req, res) {
    try {
      const { search, amount, page = 1, limit = 12 } = req.query;
      const studentId = req.user._id;

      // Build query
      let query = {
        status: 'active',
        deadline: { $gt: new Date() }
      };

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { eligibility: { $regex: search, $options: 'i' } }
        ];
      }

      if (amount) {
        query.amount = { $gte: parseFloat(amount) };
      }

      // Get scholarships student hasn't applied for
      const appliedScholarshipIds = await Application.find({ studentId })
        .distinct('scholarshipId');
      
      query._id = { $nin: appliedScholarshipIds };

      const scholarships = await Scholarship.find(query)
        .populate('donorId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Scholarship.countDocuments(query);

      res.render('student/scholarships', {
        title: 'Available Scholarships - EduConnect',
        scholarships,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        search: search || '',
        amount: amount || '',
        user: req.user
      });
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load scholarships',
        statusCode: 500
      });
    }
  }

  // Apply for scholarship
  static async applyForScholarship(req, res) {
    try {
      const { scholarshipId } = req.params;
      const { essay, documents } = req.body;
      const studentId = req.user._id;

      // Check if already applied
      const existingApplication = await Application.findOne({ 
        studentId, 
        scholarshipId 
      });

      if (existingApplication) {
        return res.status(400).json({ 
          success: false, 
          error: 'You have already applied for this scholarship' 
        });
      }

      // Check if scholarship exists and is active
      const scholarship = await Scholarship.findOne({
        _id: scholarshipId,
        status: 'active',
        deadline: { $gt: new Date() }
      });

      if (!scholarship) {
        return res.status(404).json({ 
          success: false, 
          error: 'Scholarship not found or no longer available' 
        });
      }

      // Create application
      const application = new Application({
        studentId,
        scholarshipId,
        essay,
        documents: documents || [],
        status: 'pending'
      });

      await application.save();

      // Emit real-time notification to donor and admin
      const populatedApp = await Application.findById(application._id)
        .populate('studentId', 'name email')
        .populate('scholarshipId', 'title amount');

      req.io.to('donor').emit('new-application', {
        application: populatedApp,
        scholarship: scholarship
      });

      req.io.to('admin').emit('new-application', {
        application: populatedApp,
        scholarship: scholarship
      });

      res.json({ success: true, application });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // View my applications
  static async getMyApplications(req, res) {
    try {
      const applications = await Application.find({ studentId: req.user._id })
        .populate('scholarshipId', 'title amount deadline donorId')
        .populate({
          path: 'scholarshipId',
          populate: {
            path: 'donorId',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 });

      res.render('student/applications', {
        title: 'My Applications - EduConnect',
        applications,
        user: req.user
      });
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load applications',
        statusCode: 500
      });
    }
  }

  // Update profile
  static async updateProfile(req, res) {
    try {
      const { name, phone, education, interests } = req.body;
      
      await User.findByIdAndUpdate(req.user._id, {
        name,
        phone,
        profile: {
          education,
          interests
        }
      });

      res.redirect('/student/profile');
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to update profile',
        statusCode: 500
      });
    }
  }
}

module.exports = StudentController;