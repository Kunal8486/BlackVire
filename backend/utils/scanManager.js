// backend/utils/scanManager.js
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const scans = {}; // Store scan metadata

const startScan = (scanType = 'quick', targets = '127.0.0.1') => {
  const id = uuidv4();
  const scanPath = path.join(__dirname, '..', 'scans');
  if (!fs.existsSync(scanPath)) fs.mkdirSync(scanPath);

  const outputPath = path.join(scanPath, `${id}.json`);
  const args = ['-oX', '-', targets]; // Nmap in XML to stdout

  if (scanType === 'quick') args.unshift('-T4'); // Quick scan optimization
  else if (scanType === 'full') args.unshift('-T4', '-A', '-v');

  const child = spawn('nmap', args);
  let rawOutput = '';

  scans[id] = {
    id,
    status: 'running',
    progress: 0,
    stage: 'Scanning...',
    findings: [],
    startedAt: new Date(),
    process: child,
    outputPath,
  };

  child.stdout.on('data', data => {
    rawOutput += data.toString();
  });

  child.stderr.on('data', err => {
    console.error(`stderr: ${err}`);
  });

  child.on('exit', code => {
    if (code === 0) {
      scans[id].status = 'completed';
      scans[id].progress = 100;
      scans[id].stage = 'Completed';

      // Parse output (for now, just save it)
      fs.writeFileSync(outputPath, rawOutput);
      scans[id].results = {
        scanId: id,
        systemsScanned: 1,
        totalIssues: 1,
        threatLevel: 'low',
        timestamp: Date.now(),
        findings: [
          {
            id: '1',
            title: 'Open Port Detected',
            severity: 'low',
            description: 'Port 22 is open',
            remediation: 'Close the port if not in use or use a firewall.',
          },
        ]
      };
    } else {
      scans[id].status = 'failed';
      scans[id].stage = 'Scan failed';
    }
  });

  return id;
};

const getScanStatus = (id) => {
  const scan = scans[id];
  if (!scan) return null;

  return {
    status: scan.status,
    progress: scan.progress,
    currentStage: scan.stage,
  };
};

const getScanResults = (id) => {
  const scan = scans[id];
  if (!scan || scan.status !== 'completed') return null;
  return scan.results;
};

const cancelScan = (id) => {
  const scan = scans[id];
  if (!scan || scan.status !== 'running') return false;

  scan.process.kill();
  scan.status = 'cancelled';
  scan.stage = 'Scan cancelled';
  return true;
};

module.exports = { startScan, getScanStatus, getScanResults, cancelScan };