// controllers/AuthController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

class AuthController {

  // -------------------------------
  // Render Login Page
  // -------------------------------
  static renderLogin(req, res) {
    res.render('auth/login', {
      title: 'Login - EduConnect',
      error: null
    });
  }

  // -------------------------------
  // Render Register Page
  // -------------------------------
  static renderRegister(req, res) {
    res.render('auth/register', {
      title: 'Register - EduConnect',
      error: null
    });
  }

  // -------------------------------
  // Registration Validation Middleware
  // -------------------------------
  static validateRegister() {
    return [
      body('email').isEmail().withMessage('Invalid email format'),
      body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
      body('role').isIn(['student', 'donor']).withMessage('Invalid role selection'),
      body('fullName').notEmpty().withMessage('Full name is required')
    ];
  }

  // -------------------------------
  // Handle User Registration
  // -------------------------------
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/register', {
          title: 'Register - EduConnect',
          error: errors.array()[0].msg
        });
      }

      const { username, email, password, role, fullName, school, grade, motivation } = req.body;

      // Prevent admin self-registration
      if (role === 'admin') {
        return res.render('auth/register', {
          title: 'Register - EduConnect',
          error: 'Admin registration not allowed'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render('auth/register', {
          title: 'Register - EduConnect',
          error: 'Registration failed. Please try again.'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Prepare user data
      const userData = {
        name: username || fullName,
        email,
        password: hashedPassword,
        role,
        isVerified: false // Never auto-verify admins
      };

      // Role-specific fields
      if (role === 'student') {
        userData.school = school;
        userData.grade = grade;
      } else if (role === 'donor') {
        userData.motivation = motivation;
      }

      // Save user
      const user = new User(userData);
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set secure cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Redirect based on role
      const roleRedirects = {
        admin: '/admin/dashboard', // Should never happen here
        donor: '/donor/dashboard',
        student: '/student/dashboard'
      };
      res.redirect(roleRedirects[role] || '/');

    } catch (error) {
      console.error('Registration Error:', error);
      res.render('auth/register', {
        title: 'Register - EduConnect',
        error: 'Registration failed. Please try again.'
      });
    }
  }

  // -------------------------------
  // Login Validation Middleware
  // -------------------------------
  static validateLogin() {
    return [
      body('email').isEmail().withMessage('Invalid email format'),
      body('password').notEmpty().withMessage('Password is required')
    ];
  }

  // -------------------------------
  // Handle User Login
  // -------------------------------
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('auth/login', {
          title: 'Login - EduConnect',
          error: errors.array()[0].msg
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.render('auth/login', {
          title: 'Login - EduConnect',
          error: 'Invalid email or password'
        });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render('auth/login', {
          title: 'Login - EduConnect',
          error: 'Invalid email or password'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set secure cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      // Redirect based on role
      const roleRedirects = {
        admin: '/admin/dashboard',
        donor: '/donor/dashboard',
        student: '/student/dashboard'
      };
      res.redirect(roleRedirects[user.role] || '/');

    } catch (error) {
      console.error('Login Error:', error);
      res.render('auth/login', {
        title: 'Login - EduConnect',
        error: 'Login failed. Please try again.'
      });
    }
  }

  // -------------------------------
  // Handle Logout
  // -------------------------------
  static logout(req, res) {
    res.clearCookie('token');
    res.redirect('/');
  }

}

module.exports = AuthController;
