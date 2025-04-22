// backend/routes/stressTest.js
const express = require('express');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec); // ✅ Fixed promisification
const router = express.Router();
const validator = require('validator');

/**
 * Network stress testing endpoint
 * Runs iperf3 tests against specified target with safety controls
 */
router.post('/api/stress-test', async (req, res) => {
  try {
    const { targetIP, duration } = req.body;
    
    // Validate required inputs
    if (!targetIP || !duration) {
      return res.status(400).json({ error: 'Missing target IP or duration' });
    }
    
    // Validate IP address format
    if (!validator.isIP(targetIP)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }
    
    // Validate duration is a reasonable number
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 60) {
      return res.status(400).json({ 
        error: 'Duration must be a positive number between 1-60 seconds' 
      });
    }
    
    // Set additional iperf3 parameters for controlled testing
    const maxBandwidth = '100M'; // Limit bandwidth usage
    const reportInterval = '1';   // Report stats every second
    
    // Use template literals with validated parameters
    const cmd = `iperf3 -c ${targetIP} -t ${durationNum} -b ${maxBandwidth} -i ${reportInterval} -J`;
    
    // Execute as promise with timeout
    const { stdout, stderr } = await execAsync(cmd, { timeout: (durationNum + 5) * 1000 });
    
    // Parse JSON output from iperf3
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (parseError) {
      return res.json({ output: stdout });
    }
    
    // Return formatted results
    return res.json({
      summary: {
        sentMbps: result.end.sum_sent.bits_per_second / 1000000,
        receivedMbps: result.end.sum_received.bits_per_second / 1000000,
        duration: result.end.sum_sent.seconds,
        retransmits: result.end.sum_sent.retransmits || 0
      },
      rawOutput: result
    });
    
  } catch (error) {
    console.error('Stress test error:', error);
    return res.status(500).json({ 
      error: 'Error executing stress test', 
      details: error.message 
    });
  }
});

module.exports = router;