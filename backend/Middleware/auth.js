const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token') || 
                (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? 
                req.headers.authorization.split(' ')[1] : null);

  // Check if no token
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No authentication token, access denied' 
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired, please login again' 
      });
    }
    
    // Set user data to req.user
    req.user = {
      userId: decoded.userId,
      role: decoded.role // Include role if you're using it for permissions
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired, please login again' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};