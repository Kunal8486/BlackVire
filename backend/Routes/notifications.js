const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notifications');
const auth = require('../Middleware/auth');

// @route   GET api/notifications
// @desc    Get all notifications for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ date: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.userId,
      read: false
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/mark-read/:id
// @desc    Mark a notification as read
// @access  Private
router.put('/mark-read/:id', auth, async (req, res) => {
  try {
    let notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check user owns this notification
    if (notification.user.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;