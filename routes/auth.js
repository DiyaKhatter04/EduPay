// Authentication Routes - Unified Login/Register System
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/authMiddleware');
const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// GET /auth/login - Display login page
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) {
    // User already logged in, redirect to appropriate dashboard
    return res.redirect(`/${req.user.role}/dashboard`);
  }
  
  res.render('auth/login', {
    title: 'Login - EduConnect',
    error: req.query.error,
    success: req.query.success
  });
});

// GET /auth/register - Display registration page
router.get('/register', optionalAuth, (req, res) => {
  if (req.user) {
    return res.redirect(`/${req.user.role}/dashboard`);
  }
  
  res.render('auth/register', {
    title: 'Register - EduConnect',
    error: req.query.error,
    success: req.query.success
  });
});

// POST /auth/login - Handle login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).redirect('/auth/login?error=Please provide username and password');
    }

    // Check for admin credentials first (hardcoded for security)
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      // Find or create admin user in database
      let adminUser = await User.findOne({ username, role: 'admin' });
      
      if (!adminUser) {
        adminUser = new User({
          username,
          password, // Will be hashed by pre-save middleware
          email: 'admin@educonnect.com',
          role: 'admin'
        });
        await adminUser.save();
        console.log('✅ Admin user created in MongoDB');
      }

      const token = generateToken(adminUser._id);
      
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.redirect('/admin/dashboard');
    }

    // Find user in database
    const user = await User.findOne({ username, isActive: true });

    if (!user) {
      return res.status(401).redirect('/auth/login?error=Invalid username or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).redirect('/auth/login?error=Invalid username or password');
    }

    // Update last login and save to MongoDB
    user.lastLogin = new Date();
    await user.save();
    console.log(`✅ User login saved to MongoDB: ${user.username} (${user.role})`);

    // Generate token
    const token = generateToken(user._id);
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to appropriate dashboard based on role
    res.redirect(`/${user.role}/dashboard`);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).redirect('/auth/login?error=An error occurred during login');
  }
});

// POST /auth/register - Handle registration
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      confirmPassword, 
      role, 
      fullName, 
      school, 
      grade 
    } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).redirect('/auth/register?error=Please fill in all required fields');
    }

    if (password !== confirmPassword) {
      return res.status(400).redirect('/auth/register?error=Passwords do not match');
    }

    if (!['student', 'donor'].includes(role)) {
      return res.status(400).redirect('/auth/register?error=Invalid role selected');
    }

    if (password.length < 6) {
      return res.status(400).redirect('/auth/register?error=Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.status(400).redirect('/auth/register?error=Username or email already exists');
    }

    // Create new user object
    const userData = {
      username,
      email,
      password, // Will be hashed by pre-save middleware
      role
    };

    // Add role-specific information
    if (role === 'student') {
      userData.studentInfo = {
        fullName,
        school,
        grade,
        requirements: []
      };
    } else if (role === 'donor') {
      userData.donorInfo = {
        fullName,
        totalDonations: 0,
        isRegularDonor: false
      };
    }

    // Save to MongoDB
    const newUser = new User(userData);
    await newUser.save();

    console.log(`✅ New ${role} registered and saved to MongoDB:`, {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      uniqueId: newUser.uniqueId,
      _id: newUser._id
    });

    // Auto-login after registration
    const token = generateToken(newUser._id);
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Emit real-time notification to admin
    if (req.io) {
      req.io.to('admin').emit('new-user-registration', {
        username: newUser.username,
        role: newUser.role,
        uniqueId: newUser.uniqueId,
        registeredAt: newUser.createdAt
      });
    }

    res.redirect(`/${role}/dashboard?success=Registration successful! Welcome to EduConnect`);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).redirect('/auth/register?error=Username or email already exists');
    }
    
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return res.status(400).redirect(`/auth/register?error=${encodeURIComponent(message)}`);
    }
    
    res.status(500).redirect('/auth/register?error=An error occurred during registration');
  }
});

// POST /auth/logout - Handle logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/?success=Successfully logged out');
});

// GET /auth/logout - Handle logout (for logout links)
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/?success=Successfully logged out');
});

module.exports = router;