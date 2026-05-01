const jwt = require('jsonwebtoken'); //modulo per la decodifica e verifica dei token

/**
 * Authentication Middleware
 *
 * Verifies JWT token from Authorization header.
 * If valid, attaches standardized user object to req.user.
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || ''; //lettura dell'header
  const [scheme, token] = header.split(' ');

  // Check for Bearer token
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //contollo firma e scadenza
    //Popolamento req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next(); //passa alla route handler
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Role-based Authorization Middleware
 *
 * Ensures the authenticated user has the required role.
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions'
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
