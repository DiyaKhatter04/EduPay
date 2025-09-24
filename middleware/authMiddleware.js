// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// -------------------------
// Authenticate JWT Token
// -------------------------
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token || 
                  req.session?.token;

    if (!token) {
      return res.status(401).redirect('/auth/login?error=Please log in to access this page');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).redirect('/auth/login?error=User not found or inactive');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).redirect('/auth/login?error=Invalid or expired token');
  }
};

// -------------------------
// Optional Authentication
// -------------------------
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token || 
                  req.session?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    console.log('Optional auth failed:', error.message);
  }

  next();
};

// -------------------------
// Role Check Middleware
// -------------------------
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).render('error', {
        title: 'Authentication Required - EduConnect',
        error: 'Please log in to access this page',
        statusCode: 401
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'Access Denied - EduConnect',
        error: `You do not have permission to access this page (Required role: ${roles.join(', ')})`,
        statusCode: 403
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
