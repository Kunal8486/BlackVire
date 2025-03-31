const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minLength: 2,
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      minLength: 3,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minLength: 6,
      select: false, 
    },
    bio: {
      type: String,
      default: '',
      maxLength: 500
    },
    profilePicture: {
      type: String,
      default: 'uploads/default-profile-pic.jpg',
    },
    role: {
      type: String,
      enum: ['User', 'Admin', 'Analyst'],
      default: 'User'
    },
    googleId: {
      type: String,
    },
    agreeToTerms: {
      type: Boolean,
      required: [true, 'You must agree to terms and privacy policy'],
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: {
      type: String,
      select: false
    },
    verificationExpires: {
      type: Date,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpire: {
      type: Date,
      select: false
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: {
      type: Date,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Auto-generate username before saving
UserSchema.pre('save', async function (next) {
  if (!this.username) {
    let baseUsername = this.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let newUsername = baseUsername;
    let counter = 1;
    while (await mongoose.model('User').findOne({ username: newUsername })) {
      newUsername = `${baseUsername}${counter++}`;
    }
    this.username = newUsername;
  }
  next();
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password matches
UserSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    if (!this.password) {
      const user = await this.constructor.findById(this._id).select('+password');
      return await bcrypt.compare(enteredPassword, user.password);
    }
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password verification failed');
  }
};

// Method to generate reset token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Update last login timestamp
UserSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);
