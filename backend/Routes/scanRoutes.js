// backend/routes/scanRoutes.js
const express = require('express');
const router = express.Router();
const { startScan, getScanStatus, getScanResults, cancelScan } = require('../utils/scanManager');

router.post('/start', async (req, res) => {
    try {
      console.log('Incoming request:', req.body); // 👀 Log input
      const { scanType, targets } = req.body;
  
      if (!scanType || !targets) {
        return res.status(400).json({ error: 'Missing scanType or targets' });
      }
  
      const scanId = startScan(scanType, targets); // Or whatever your function is
      return res.json({ id: scanId }); // ✅ Must return JSON
    } catch (err) {
      console.error('Scan error:', err); // 👀 Debug here
      return res.status(500).json({ error: 'Internal Server Error' }); // ✅ Still JSON
    }
});
  

router.get('/status/:id', (req, res) => {
  const status = getScanStatus(req.params.id);
  if (!status) return res.status(404).json({ message: 'Scan not found' });
  res.json(status);
});

router.get('/results/:id', (req, res) => {
  const results = getScanResults(req.params.id);
  if (!results) return res.status(404).json({ message: 'Results not found or scan incomplete' });
  res.json(results);
});

router.post('/cancel/:id', (req, res) => {
  const success = cancelScan(req.params.id);
  if (!success) return res.status(400).json({ message: 'Cannot cancel scan' });
  res.json({ message: 'Scan cancelled' });
});

module.exports = router;