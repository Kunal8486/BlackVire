// models/OtpVerification.js
const mongoose = require('mongoose');

const OtpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },

  verificationCode: {
    type: String,
    required: true,
  },

});

module.exports = mongoose.model('OtpVerification', OtpVerificationSchema);
