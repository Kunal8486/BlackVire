// backend/routes/scanRoutes.js
const express = require('express');
const router = express.Router();
const { 
  startScan, 
  getScanStatus, 
  getScanResults, 
  cancelScan 
} = require('../utils/scanManager');

/**
 * Start a new security scan
 * @route POST /api/scan/start
 */
router.post('/start', async (req, res) => {
  try {
    const { scanType, targets } = req.body;
    
    // Validate required inputs
    if (!scanType) {
      return res.status(400).json({ 
        error: 'Missing required parameter: scanType',
        details: 'Valid scan types are: quick, standard, deep'
      });
    }
    
    if (!targets) {
      return res.status(400).json({ 
        error: 'Missing required parameter: targets',
        details: 'Please provide an IP address, hostname, or CIDR notation'
      });
    }
    
    // Start the scan and return ID
    const scanId = startScan(scanType, targets);
    
    return res.status(201).json({ 
      id: scanId,
      message: 'Scan started successfully',
      status: 'running' 
    });
  } catch (err) {
    console.error('Scan start error:', err);
    
    // Return appropriate status code based on error type
    if (err.message && err.message.includes('Invalid scan type')) {
      return res.status(400).json({ 
        error: 'Invalid scan configuration',
        details: err.message
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

/**
 * Get the current status of a scan
 * @route GET /api/scan/status/:id
 */
router.get('/status/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing scan ID' });
    }
    
    const status = getScanStatus(id);
    
    if (!status) {
      return res.status(404).json({ 
        error: 'Scan not found',
        details: 'The requested scan ID does not exist or has expired'
      });
    }
    
    return res.json(status);
  } catch (err) {
    console.error('Status check error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scan status' });
  }
});

/**
 * Get the results of a completed scan
 * @route GET /api/scan/results/:id
 */
router.get('/results/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing scan ID' });
    }
    
    const results = getScanResults(id);
    
    if (!results) {
      // Check status to provide better error
      const status = getScanStatus(id);
      
      if (!status) {
        return res.status(404).json({ 
          error: 'Scan not found',
          details: 'The requested scan ID does not exist or has expired'
        });
      }
      
      if (status.status === 'running') {
        return res.status(409).json({ 
          error: 'Scan in progress',
          details: 'Results are not available until the scan completes',
          progress: status.progress,
          currentStage: status.currentStage
        });
      }
      
      if (status.status === 'cancelled') {
        return res.status(410).json({ 
          error: 'Scan was cancelled',
          details: 'Results are not available for cancelled scans'
        });
      }
      
      if (status.status === 'failed') {
        return res.status(500).json({ 
          error: 'Scan failed to complete',
          details: 'The scan encountered an error and could not generate results'
        });
      }
      
      return res.status(404).json({ 
        error: 'Results not found',
        details: 'Results are not available for this scan'
      });
    }
    
    return res.json(results);
  } catch (err) {
    console.error('Results retrieval error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scan results' });
  }
});

/**
 * Cancel an in-progress scan
 * @route POST /api/scan/cancel/:id
 */
router.post('/cancel/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing scan ID' });
    }
    
    // Check if scan exists
    const status = getScanStatus(id);
    if (!status) {
      return res.status(404).json({ 
        error: 'Scan not found',
        details: 'The requested scan ID does not exist or has expired'
      });
    }
    
    // Check if scan is running (can only cancel running scans)
    if (status.status !== 'running') {
      return res.status(409).json({ 
        error: 'Cannot cancel scan',
        details: `Scan is not running (current status: ${status.status})`
      });
    }
    
    const success = cancelScan(id);
    
    if (!success) {
      return res.status(500).json({ 
        error: 'Failed to cancel scan',
        details: 'An error occurred while attempting to cancel the scan'
      });
    }
    
    return res.json({ 
      message: 'Scan cancelled successfully',
      id
    });
  } catch (err) {
    console.error('Cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel scan' });
  }
});

/**
 * Get a list of recent scans
 * @route GET /api/scan/history
 */
router.get('/history', (req, res) => {
  try {
    // Not implemented in the scanManager yet
    // This would show recent scan history for the user
    return res.status(501).json({ 
      error: 'Not implemented',
      details: 'Scan history functionality is not yet available'
    });
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Failed to retrieve scan history' });
  }
});

module.exports = router;