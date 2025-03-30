const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../Models/Users');
const auth = require('../Middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for avatars
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function(req, file, cb) {
    cb(null, 'avatar-' + req.user.userId + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Filter for image files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image file.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 2 // 2MB limit
  },
  fileFilter: fileFilter
});

// Helper function to format user data with full avatar URL
const formatUserWithFullAvatarUrl = (user, req) => {
  const userData = user.toObject();
  
  // Make sure profilePicture exists before trying to modify it
  if (userData.profilePicture) {
    // Only format the URL if it doesn't already start with http
    if (!userData.profilePicture.startsWith('http')) {
      // Clean any leading slashes before joining
      userData.profilePicture = `${req.protocol}://${req.get('host')}/${userData.profilePicture.replace(/^\/+/, '')}`;
    }
  } else {
    // Add a default avatar URL if none exists
    userData.profilePicture = `${req.protocol}://${req.get('host')}/uploads/default-profile-pic.jpg`;
  }
  
  return userData;
};

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Use helper function to format user with full avatar URL
    const userData = formatUserWithFullAvatarUrl(user, req);
    
    res.json(userData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/profile/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/profile/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Use helper function to format user with full avatar URL
    const userData = formatUserWithFullAvatarUrl(user, req);
    
    res.json(userData);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/current
// @desc    Get current user data (lightweight for navbar)
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('fullName username email role profilePicture');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Use helper function to format user with full avatar URL
    const userData = formatUserWithFullAvatarUrl(user, req);
    
    res.json({ success: true, user: userData });
  } catch (err) {
    console.error('Error fetching current user:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('fullName').trim().isLength({ min: 2 }).optional().withMessage('Name must be at least 2 characters'),
  body('role').trim().optional().isIn(['User', 'Admin', 'Analyst']).withMessage('Invalid role'),
  body('bio').trim().optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, role, bio } = req.body;
  const userFields = {};
  if (fullName) userFields.fullName = fullName;
  if (role) userFields.role = role;
  if (bio !== undefined) userFields.bio = bio;

  try {
    let user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    // Use helper function to format user with full avatar URL
    const userData = formatUserWithFullAvatarUrl(user, req);

    res.json(userData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', [auth, upload.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // Create the avatar path
    const avatarPath = req.file.path.replace(/\\/g, '/'); // Normalize path for all OS

    // Get the old avatar to delete it later
    const user = await User.findById(req.user.userId);
    const oldAvatar = user.profilePicture;

    // Update the user's profilePicture field
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePicture: avatarPath },
      { new: true }
    ).select('-password');
    
    // Delete old avatar if it's not the default and exists on server
    if (oldAvatar && 
        oldAvatar !== 'uploads/default-profile-pic.jpg' && 
        !oldAvatar.startsWith('http')) {
      // Extract path from URL if needed
      const oldAvatarPath = oldAvatar.replace(/^.*\/\/[^/]+\//, '');
      
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
        } catch (err) {
          console.error('Failed to delete old avatar:', err);
        }
      }
    }
    
    // Use helper function to format user with full avatar URL
    const userData = formatUserWithFullAvatarUrl(updatedUser, req);

    // Make sure to update user data in local storage via response
    res.json({
      success: true,
      user: userData,
      message: 'Avatar updated successfully'
    });
  } catch (err) {
    console.error(err.message);
    if (err.message === 'Not an image! Please upload an image file.') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;