// Donor Controller
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const User = require('../models/User');

class DonorController {
  // Render donor dashboard
  static async renderDashboard(req, res) {
    try {
      const donorId = req.user._id;
      
      const stats = {
        totalScholarships: await Scholarship.countDocuments({ donorId }),
        totalFunded: await Scholarship.aggregate([
          { $match: { donorId: donorId } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0),
        activeScholarships: await Scholarship.countDocuments({ 
          donorId, 
          status: 'active',
          deadline: { $gt: new Date() }
        }),
        studentsHelped: await Application.countDocuments({
          scholarshipId: { 
            $in: await Scholarship.find({ donorId }).distinct('_id')
          },
          status: 'approved'
        })
      };

      const myScholarships = await Scholarship.find({ donorId })
        .sort({ createdAt: -1 })
        .limit(5);

      const recentApplications = await Application.find({
        scholarshipId: { 
          $in: await Scholarship.find({ donorId }).distinct('_id')
        }
      })
        .populate('studentId', 'name email')
        .populate('scholarshipId', 'title amount')
        .sort({ createdAt: -1 })
        .limit(10);

      res.render('donor/dashboard', {
        title: 'Donor Dashboard - EduConnect',
        user: req.user,
        stats,
        myScholarships,
        recentApplications
      });
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to load dashboard data',
        statusCode: 500
      });
    }
  }

  // Create new scholarship
  static async createScholarship(req, res) {
    try {
      const { title, description, amount, eligibility, deadline } = req.body;
      
      const scholarship = new Scholarship({
        title,
        description,
        amount: parseFloat(amount),
        eligibility,
        deadline: new Date(deadline),
        donorId: req.user._id,
        status: 'active'
      });

      await scholarship.save();

      // Emit real-time notification to students
      req.io.to('student').emit('new-scholarship', {
        id: scholarship._id,
        title: scholarship.title,
        amount: scholarship.amount,
        donor: req.user.name
      });

      res.redirect('/donor/scholarships');
    } catch (error) {
      res.render('error', {
        title: 'Error - EduConnect',
        error: 'Failed to create scholarship',
        statusCode: 500
      });
    }
  }

  // Get donor's scholarships
  static async getScholarships(req, res) {
    try {
      const scholarships = await Scholarship.find({ donorId: req.user._id })
        .sort({ createdAt: -1 });

      // Get application counts for each scholarship
      const scholarshipsWithStats = await Promise.all(
        scholarships.map(async (scholarship) => {
          const applications = await Application.countDocuments({ 
            scholarshipId: scholarship._id 
          });
          const approved = await Application.countDocuments({ 
            scholarshipId: scholarship._id,
            status: 'approved'
          });
          
          return {
            ...scholarship.toObject(),
            totalApplications: applications,
            approvedApplications: approved
          };
        })
      );

      res.render('donor/scholarships', {
        title: 'My Scholarships - EduConnect',
        scholarships: scholarshipsWithStats,
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

  // View applications for a scholarship
  static async viewApplications(req, res) {
    try {
      const { scholarshipId } = req.params;
      
      const scholarship = await Scholarship.findOne({
        _id: scholarshipId,
        donorId: req.user._id
      });

      if (!scholarship) {
        return res.render('error', {
          title: 'Error - EduConnect',
          error: 'Scholarship not found',
          statusCode: 404
        });
      }

      const applications = await Application.find({ scholarshipId })
        .populate('studentId', 'name email phone')
        .sort({ createdAt: -1 });

      res.render('donor/applications', {
        title: `Applications - ${scholarship.title}`,
        scholarship,
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

  // Update scholarship status
  static async updateScholarshipStatus(req, res) {
    try {
      const { scholarshipId } = req.params;
      const { status } = req.body;

      await Scholarship.findOneAndUpdate(
        { _id: scholarshipId, donorId: req.user._id },
        { status },
        { new: true }
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = DonorController;