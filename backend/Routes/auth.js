// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../Models/Users');
const OtpVerification = require('../Models/OTP');
const auth = require('../Middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  // Replace with your actual email service configuration
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});

// @route   POST api/auth/request-verification
// @desc    Send verification code to email
// @access  Public
router.post('/request-verification', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Please include a valid email'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { email } = req.body;

  try {
    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered' 
      });
    }

    // Generate 6-digit verification code (to match frontend expectation)
    // This replaces the 3-byte hex string with a 6-digit numeric code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Delete any existing OTP verification records for this email
    await OtpVerification.deleteMany({ email });

    // Create new OTP verification record
    const otpVerification = new OtpVerification({
      email,
      verificationCode
    });

    await otpVerification.save();

    // Send verification email
    await sendVerificationEmail(email, "User", verificationCode);

    // Return success message
    res.status(201).json({ 
      success: true, 
      message: 'Verification code sent! Please check your email.',
      email
    });
  } catch (err) {
    console.error('Verification request error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   POST api/auth/register
// @desc    Register new user with verification code
// @access  Public
router.post('/register', [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Please include a valid email'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('verificationCode').trim().isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 characters'),
  body('agreeToTerms').equals('true').withMessage('You must agree to the terms and privacy policy')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { fullName, email, password, verificationCode, agreeToTerms } = req.body;

  try {
    // Check if email is already registered
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered' 
      });
    }

    // Verify the code
    const otpRecord = await OtpVerification.findOne({ 
      email,
      verificationCode
    });
    
    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification code' 
      });
    }

    // Code is valid, hash password

    // Create new user in User collection
    const newUser = new User({
      fullName,
      email,
      password: password,
      agreeToTerms: agreeToTerms === 'true',
      isVerified: true
    });

    await newUser.save();
    
    // Delete OTP verification record
    await OtpVerification.deleteOne({ _id: otpRecord._id });
    
    // Return success message
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! You can now log in.',
      userId: newUser._id
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   POST api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { email } = req.body;
    
    // Check if user already exists in main User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered and verified' 
      });
    }
    
    // Generate new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Find and update or create new OTP verification record
    let otpRecord = await OtpVerification.findOne({ email });
    
    if (otpRecord) {
      // Update existing record
      otpRecord.verificationCode = verificationCode;
      otpRecord.createdAt = Date.now(); // Reset expiration timer
      await otpRecord.save();
    } else {
      // Create new record
      otpRecord = new OtpVerification({
        email,
        verificationCode
      });
      await otpRecord.save();
    }
    
    // Send new verification email
    await sendVerificationEmail(email, "User", verificationCode);
    
    // Return success message
    res.json({ 
      success: true, 
      message: 'Verification email has been resent. Please check your inbox.' 
    });
  } catch (err) {
    console.error('Resend verification error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  
  try {
    const { email, password } = req.body;

    // Check if there's a pending verification for this email
    const pendingVerification = await OtpVerification.findOne({ email });
    if (pendingVerification) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please complete your email verification before logging in',
        needsVerification: true,
        email: email
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    // Create JWT payload
    const payload = {
      userId: user._id,
      role: user.role
    };

    // Create and sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success with token and user data
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        profilePicture: user.profilePicture
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        profilePicture: user.profilePicture,
        bio: user.bio,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    console.error('Get user profile error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   POST api/auth/refresh-token
// @desc    Refresh authentication token
// @access  Private
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Create new token
    const payload = {
      userId: user._id,
      role: user.role
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// @route   GET api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.get('/logout', auth, async (req, res) => {
  try {
    // Implementation depends on how you handle token invalidation
    // If using a token blacklist or Redis for token storage:
    // await invalidateToken(req.token);
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout' 
    });
  }
});

// Helper function to send verification email
const sendVerificationEmail = async (email, name, code) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Verify your Blackvire account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #333; margin-bottom: 5px;">BLACKVIRE</h1>
          <div style="height: 3px; width: 100px; background: linear-gradient(to right, #00e696, #00a8e8); margin: 0 auto;"></div>
        </div>
        <h2 style="color: #333;">Hello, ${name}!</h2>
        <p style="color: #666; line-height: 1.5;">Thank you for registering with Blackvire. Please verify your email address to continue.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Your verification code</h3>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #00a8e8;">${code}</div>
        </div>
        <p style="color: #666; line-height: 1.5;">This code will expire in 60 minutes. If you didn't request this verification, please ignore this email.</p>
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Blackvire. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};




// Middleware to validate email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Middleware for error handling
const handleError = (res, error, customMessage = "Server error") => {
  console.error(`❌ ${customMessage}:`, error)
  return res.status(500).json({ 
    message: customMessage, 
    error: error.message || error 
  })
}


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" })
    }

    // Find user with proper error handling
    const user = await User.findOne({ email }).exec()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Generate tokens with stronger randomness
    const token = crypto.randomBytes(64).toString("hex")
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
      expiresIn: "1h" 
    })

    // Update user with reset tokens
    user.resetPasswordToken = token
    user.resetPasswordExpires = Date.now() + 3600000
    
    // Save with error handling
    try {
      await user.save()
    } catch (saveError) {
      return handleError(res, saveError, "Failed to save reset token")
    }

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
    }

    // Send email with comprehensive error handling
    try {
      await transporter.sendMail(mailOptions)
      res.json({ message: "Reset link sent to your email" })
    } catch (emailError) {
      return handleError(res, emailError, "Failed to send reset email")
    }
  } catch (error) {
    handleError(res, error)
  }
})

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params
    const { newPassword } = req.body

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long" 
      })
    }

    // Verify token with error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (tokenError) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    // Find user with proper query
    const user = await User.findById(decoded.id).exec()
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    
    // Update user password
    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    // Save with error handling
    try {
      await user.save()
      res.json({ message: "Password reset successful" })
    } catch (saveError) {
      return handleError(res, saveError, "Failed to update password")
    }
  } catch (error) {
    handleError(res, error)
  }
})


module.exports = router;