const roleMiddleware = (allowedRoles) => {
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
        error: 'You do not have permission to access this page',
        statusCode: 403
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
