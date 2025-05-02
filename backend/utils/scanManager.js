// backend/utils/scanManager.js
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Store scan metadata
const scans = {};

// Scan stages for better progress reporting
const SCAN_STAGES = {
  QUICK: [
    { name: 'Initializing scan', duration: 5 },
    { name: 'Port discovery', duration: 20 },
    { name: 'Service identification', duration: 30 },
    { name: 'Vulnerability check', duration: 30 },
    { name: 'Generating report', duration: 15 }
  ],
  STANDARD: [
    { name: 'Initializing scan', duration: 5 },
    { name: 'Host discovery', duration: 15 },
    { name: 'Port scanning', duration: 25 },
    { name: 'Service enumeration', duration: 25 },
    { name: 'OS detection', duration: 15 },
    { name: 'Vulnerability assessment', duration: 40 },
    { name: 'Generating report', duration: 15 }
  ],
  DEEP: [
    { name: 'Initializing scan', duration: 5 },
    { name: 'Network mapping', duration: 20 },
    { name: 'Thorough port discovery', duration: 30 },
    { name: 'Service fingerprinting', duration: 25 },
    { name: 'OS and version detection', duration: 20 },
    { name: 'Script scanning', duration: 40 },
    { name: 'Vulnerability assessment', duration: 50 },
    { name: 'Exploitation checks', duration: 40 },
    { name: 'Report generation', duration: 20 }
  ]
};

// Simulate scan progress
const simulateProgress = (id, scanType) => {
  const stages = SCAN_STAGES[scanType.toUpperCase()] || SCAN_STAGES.QUICK;
  let currentStageIndex = 0;
  let stageProgress = 0;
  const stageIncrement = 100 / stages.length;
  
  const updateInterval = setInterval(() => {
    const scan = scans[id];
    if (!scan || scan.status !== 'running') {
      clearInterval(updateInterval);
      return;
    }

    stageProgress += 1;
    const stage = stages[currentStageIndex];
    
    if (stageProgress >= stage.duration) {
      currentStageIndex++;
      stageProgress = 0;
      
      if (currentStageIndex >= stages.length) {
        scan.progress = 100;
        scan.stage = 'Finalizing';
        clearInterval(updateInterval);
        
        // Simulate completion after a brief delay
        setTimeout(() => {
          if (scan.status === 'running') {
            completeScan(id);
          }
        }, 1000);
        
        return;
      }
    }
    
    const overallProgress = Math.min(
      Math.floor((currentStageIndex * stageIncrement) + (stageProgress / stage.duration * stageIncrement)),
      99
    );
    
    scan.progress = overallProgress;
    scan.stage = stages[currentStageIndex].name;
  }, 1000);
  
  return updateInterval;
};

// Process target input to handle different formats
const parseTargets = (targets) => {
  if (!targets) return '127.0.0.1';
  
  // Clean input and validate
  const cleaned = targets.trim();
  
  // Simple validation - this should be enhanced for production
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,61}[a-zA-Z0-9])?$/;
  
  if (ipPattern.test(cleaned) || hostnamePattern.test(cleaned)) {
    return cleaned;
  }
  
  // Default to localhost if invalid
  return '127.0.0.1';
};

// Generate mock findings based on scan type
const generateFindings = (scanType, target) => {
  const baseFindings = [
    {
      id: uuidv4(),
      title: 'Open SSH Port (22)',
      severity: 'low',
      description: 'Port 22 (SSH) is open and accessible. While not inherently a vulnerability, unnecessary open ports increase attack surface.',
      remediation: 'If SSH access is not required, disable the service or restrict access using a firewall.',
      affectedSystems: target,
      cvssScore: '3.0',
      references: [
        { title: 'SSH Security Best Practices', url: 'https://www.ssh.com/academy/ssh/security' }
      ]
    }
  ];
  
  // Add more findings for deeper scans
  if (scanType === 'standard' || scanType === 'deep') {
    baseFindings.push(
      {
        id: uuidv4(),
        title: 'Outdated SSL/TLS Version',
        severity: 'medium',
        description: 'The system is using an outdated SSL/TLS protocol version which has known vulnerabilities.',
        remediation: 'Update your SSL/TLS configuration to use only TLS 1.2 or higher and disable older protocols.',
        affectedSystems: target,
        cve: 'CVE-2015-0204',
        cvssScore: '5.3',
        references: [
          { title: 'NIST Guidelines for TLS', url: 'https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final' }
        ]
      }
    );
  }
  
  if (scanType === 'deep') {
    baseFindings.push(
      {
        id: uuidv4(),
        title: 'Critical Authentication Bypass',
        severity: 'critical',
        description: 'A potential authentication bypass vulnerability was detected in the web application, which could allow unauthorized access to protected resources.',
        remediation: 'Apply the latest security patches from the vendor and implement proper input validation.',
        affectedSystems: target,
        cve: 'CVE-2023-1234',
        cvssScore: '9.8',
        references: [
          { title: 'Authentication Best Practices', url: 'https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication' },
          { title: 'Patch Information', url: 'https://example.com/security/patches' }
        ]
      },
      {
        id: uuidv4(),
        title: 'Insecure Default Configuration',
        severity: 'high',
        description: 'The system is using default or insecure configuration settings that could be exploited by attackers.',
        remediation: 'Review and harden system configurations following security best practices and frameworks like CIS benchmarks.',
        affectedSystems: target,
        cvssScore: '7.5',
        references: [
          { title: 'CIS Benchmarks', url: 'https://www.cisecurity.org/cis-benchmarks/' }
        ]
      }
    );
  }
  
  return baseFindings;
};

// Complete a scan with results
const completeScan = (id) => {
  const scan = scans[id];
  if (!scan) return;
  
  scan.status = 'completed';
  scan.progress = 100;
  scan.stage = 'Completed';
  scan.completedAt = new Date();
  
  const findings = generateFindings(scan.scanType, scan.targets);
  
  // Generate threat level based on findings
  let threatLevel = 'none';
  if (findings.some(f => f.severity === 'critical')) {
    threatLevel = 'critical';
  } else if (findings.some(f => f.severity === 'high')) {
    threatLevel = 'high';
  } else if (findings.some(f => f.severity === 'medium')) {
    threatLevel = 'medium';
  } else if (findings.length > 0) {
    threatLevel = 'low';
  }
  
  scan.results = {
    scanId: id,
    systemsScanned: scan.scanType === 'quick' ? 1 : (scan.scanType === 'standard' ? 3 : 5),
    totalIssues: findings.length,
    threatLevel,
    timestamp: Date.now(),
    findings
  };
  
  // Save results to file
  try {
    fs.writeFileSync(scan.outputPath, JSON.stringify(scan.results, null, 2));
  } catch (err) {
    console.error(`Failed to write scan results: ${err.message}`);
  }
};

// Start a new scan
const startScan = (scanType = 'quick', targets = '127.0.0.1') => {
  try {
    // Validate scan type
    const validScanTypes = ['quick', 'standard', 'deep'];
    const normalizedScanType = scanType.toLowerCase();
    
    if (!validScanTypes.includes(normalizedScanType)) {
      throw new Error(`Invalid scan type: ${scanType}. Must be one of: ${validScanTypes.join(', ')}`);
    }
    
    // Create scan ID and prepare output directory
    const id = uuidv4();
    const scanPath = path.join(__dirname, '..', 'scans');
    
    if (!fs.existsSync(scanPath)) {
      try {
        fs.mkdirSync(scanPath, { recursive: true });
      } catch (err) {
        throw new Error(`Failed to create scan directory: ${err.message}`);
      }
    }
    
    const outputPath = path.join(scanPath, `${id}.json`);
    const parsedTargets = parseTargets(targets);
    
    // Prepare for real scan command (commented out)
    /*
    const args = ['-oX', outputPath, parsedTargets];
    
    if (normalizedScanType === 'quick') {
      args.unshift('-T4', '-F');
    } else if (normalizedScanType === 'standard') {
      args.unshift('-T4', '-A');
    } else if (normalizedScanType === 'deep') {
      args.unshift('-T3', '-A', '-v', '--script=vuln');
    }
    
    const child = spawn('nmap', args);
    */
    
    // Store scan metadata
    scans[id] = {
      id,
      scanType: normalizedScanType,
      targets: parsedTargets,
      status: 'running',
      progress: 0,
      stage: 'Initializing',
      startedAt: new Date(),
      outputPath,
      // process: child, // For real scan
    };
    
    // Start progress simulation instead of actual scan for demo
    const updateInterval = simulateProgress(id, normalizedScanType);
    scans[id].updateInterval = updateInterval;
    
    return id;
  } catch (error) {
    console.error(`Error starting scan: ${error.message}`);
    throw error;
  }
};

// Get the status of a scan
const getScanStatus = (id) => {
  const scan = scans[id];
  if (!scan) return null;
  
  return {
    status: scan.status,
    progress: scan.progress,
    currentStage: scan.stage,
    scanType: scan.scanType,
    startedAt: scan.startedAt,
    targetCount: scan.targets.includes('/') ? 'Multiple' : 1
  };
};

// Get scan results
const getScanResults = (id) => {
  const scan = scans[id];
  if (!scan) return null;
  
  // If the scan is completed and we have results
  if (scan.status === 'completed' && scan.results) {
    return scan.results;
  }
  
  // If the scan is completed but no results found, try to read from file
  if (scan.status === 'completed' && fs.existsSync(scan.outputPath)) {
    try {
      const fileData = fs.readFileSync(scan.outputPath, 'utf8');
      scan.results = JSON.parse(fileData);
      return scan.results;
    } catch (err) {
      console.error(`Failed to read scan results: ${err.message}`);
      return null;
    }
  }
  
  return null;
};

// Cancel an ongoing scan
const cancelScan = (id) => {
  const scan = scans[id];
  if (!scan || scan.status !== 'running') return false;
  
  // Clear the simulation interval
  if (scan.updateInterval) {
    clearInterval(scan.updateInterval);
  }
  
  // Kill the actual process if using real scan
  /*
  if (scan.process) {
    scan.process.kill();
  }
  */
  
  scan.status = 'cancelled';
  scan.stage = 'Scan cancelled';
  return true;
};

// Clean up old scans (you might call this periodically)
const cleanupOldScans = (maxAgeHours = 24) => {
  const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  Object.keys(scans).forEach(id => {
    const scan = scans[id];
    const scanDate = scan.completedAt || scan.startedAt;
    
    if (scanDate < cutoff) {
      // Clean up intervals
      if (scan.updateInterval) {
        clearInterval(scan.updateInterval);
      }
      
      // Clean up process
      if (scan.process && scan.status === 'running') {
        scan.process.kill();
      }
      
      // Optionally remove result file
      if (fs.existsSync(scan.outputPath)) {
        try {
          fs.unlinkSync(scan.outputPath);
        } catch (err) {
          console.error(`Failed to delete scan file: ${err.message}`);
        }
      }
      
      // Remove from memory
      delete scans[id];
    }
  });
};

module.exports = { 
  startScan, 
  getScanStatus, 
  getScanResults, 
  cancelScan,
  cleanupOldScans
};