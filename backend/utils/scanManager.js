// backend/utils/scanManager.js
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const xml2js = require('xml2js');

// Store scan metadata
const scans = {};

// Scan configuration for different types
const SCAN_CONFIGS = {
  QUICK: {
    nmapArgs: ['-T4', '-F', '--open'],  // Fast scan of most common ports
    description: 'Basic scan of common ports'
  },
  STANDARD: {
    nmapArgs: ['-T4', '-A', '-p-', '--open'],  // All ports, OS and service detection
    description: 'Comprehensive scan of all ports with service detection'
  },
  DEEP: {
    nmapArgs: ['-T3', '-A', '-p-', '--script=default,vuln,auth,brute', '--open'],  // Thorough scan with vulnerability scripts
    description: 'Deep vulnerability assessment with script scanning'
  }
};

// Process target input to handle different formats
const parseTargets = (targets) => {
  if (!targets) return '127.0.0.1';
  
  // Clean input and validate
  const cleaned = targets.trim();
  
  // Basic validation for IP addresses, CIDR ranges, and hostnames
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,61}[a-zA-Z0-9])?$/;
  const ipRangePattern = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/;
  
  if (ipPattern.test(cleaned) || hostnamePattern.test(cleaned) || ipRangePattern.test(cleaned)) {
    return cleaned;
  }
  
  // Default to localhost if invalid
  return '127.0.0.1';
};

// Parse nmap XML output to extract findings
const parseNmapResults = async (xmlPath, scanType, targets) => {
  try {
    const xmlData = fs.readFileSync(xmlPath, 'utf8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    
    if (!result.nmaprun || !result.nmaprun.host) {
      return { 
        findings: [],
        systemsScanned: 0,
        totalIssues: 0,
        threatLevel: 'none'
      };
    }
    
    // Ensure hosts is always an array
    const hosts = Array.isArray(result.nmaprun.host) ? result.nmaprun.host : [result.nmaprun.host];
    const findings = [];
    
    // Process each host
    hosts.forEach(host => {
      const hostAddress = host.address && host.address.addr ? host.address.addr : 'unknown';
      
      // Process ports if available
      if (host.ports && host.ports.port) {
        const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        
        ports.forEach(port => {
          // Basic port finding
          if (port.state && port.state.state === 'open') {
            const serviceName = port.service ? port.service.name || 'unknown' : 'unknown';
            const serviceProduct = port.service && port.service.product ? port.service.product : '';
            const serviceVersion = port.service && port.service.version ? port.service.version : '';
            
            let severity = 'low';
            let title = `Open ${serviceName.toUpperCase()} Port (${port.portid})`;
            let description = `Port ${port.portid} (${serviceName}) is open and accessible.`;
            let remediation = `If ${serviceName} access is not required, disable the service or restrict access using a firewall.`;
            let cvssScore = '3.0';
            let references = [
              { title: `${serviceName.toUpperCase()} Security Best Practices`, url: `https://www.google.com/search?q=${serviceName}+security+best+practices` }
            ];
            
            // Enhance findings based on service type
            if (serviceName === 'http' || serviceName === 'https') {
              title = `Web Server (${serviceName.toUpperCase()}) Exposed`;
              description = `${serviceName.toUpperCase()} web server is accessible on port ${port.portid}${serviceProduct ? ` (${serviceProduct} ${serviceVersion})` : ''}.`;
              remediation = 'Ensure the web server is properly configured with TLS, security headers, and access controls.';
              references.push({ title: 'OWASP Web Security', url: 'https://owasp.org/www-project-web-security-testing-guide/' });
            } else if (serviceName === 'ssh') {
              title = `SSH Service Exposed (Port ${port.portid})`;
              description = `SSH service is accessible on port ${port.portid}${serviceProduct ? ` (${serviceProduct} ${serviceVersion})` : ''}.`;
              remediation = 'Implement key-based authentication, disable root login, and use strong ciphers.';
              references.push({ title: 'SSH Hardening Guide', url: 'https://www.ssh.com/academy/ssh/security' });
            } else if (serviceName === 'ftp') {
              severity = 'medium';
              title = `FTP Service Exposed (Port ${port.portid})`;
              description = `FTP service is accessible on port ${port.portid}${serviceProduct ? ` (${serviceProduct} ${serviceVersion})` : ''}. FTP transfers data in cleartext.`;
              remediation = 'Replace FTP with SFTP or FTPS for secure file transfers.';
              cvssScore = '5.0';
              references.push({ title: 'Secure File Transfer Guide', url: 'https://www.ncsc.gov.uk/collection/small-business-guide/using-passwords-protect-your-data' });
            } else if (serviceName === 'telnet') {
              severity = 'high';
              title = `Telnet Service Exposed (Port ${port.portid})`;
              description = `Telnet service is accessible on port ${port.portid}${serviceProduct ? ` (${serviceProduct} ${serviceVersion})` : ''}. Telnet transmits data in cleartext, including passwords.`;
              remediation = 'Replace Telnet with SSH for secure remote administration.';
              cvssScore = '7.5';
              references.push({ title: 'NIST Guidelines', url: 'https://csrc.nist.gov/publications/detail/sp/800-82/rev-2/final' });
            }
            
            // Check for outdated versions
            if (serviceVersion && isOutdatedService(serviceName, serviceVersion)) {
              severity = severity === 'low' ? 'medium' : (severity === 'medium' ? 'high' : severity);
              description += ` The detected version (${serviceVersion}) may contain known vulnerabilities.`;
              remediation = `Update ${serviceName} to the latest secure version and apply all security patches.`;
            }
            
            findings.push({
              id: uuidv4(),
              title,
              severity,
              description,
              remediation,
              affectedSystems: hostAddress,
              cvssScore,
              references
            });
          }
        });
      }
      
      // Add OS detection findings
      if (host.os && host.os.osmatch && scanType !== 'quick') {
        const osMatches = Array.isArray(host.os.osmatch) ? host.os.osmatch : [host.os.osmatch];
        if (osMatches.length > 0) {
          const topOs = osMatches[0];
          const osName = topOs.name || 'Unknown OS';
          
          // Check for end-of-life operating systems
          if (isEolOperatingSystem(osName)) {
            findings.push({
              id: uuidv4(),
              title: 'End-of-Life Operating System Detected',
              severity: 'high',
              description: `The system appears to be running ${osName}, which is no longer supported with security updates.`,
              remediation: 'Upgrade to a supported operating system version that receives regular security updates.',
              affectedSystems: hostAddress,
              cvssScore: '7.8',
              references: [
                { title: 'OS End-of-Life Risks', url: 'https://www.cisa.gov/news-events/alerts/2019/06/17/microsoft-ending-support-windows-server-2008-and-windows-7' }
              ]
            });
          }
        }
      }
      
      // Add script findings for deep scans
      if (scanType === 'deep' && host.hostscript) {
        const scripts = Array.isArray(host.hostscript.script) ? host.hostscript.script : [host.hostscript.script];
        
        scripts.forEach(script => {
          if (script.id && script.output) {
            // Process vulnerability scripts
            if (script.id.startsWith('vuln-') || script.id.includes('vuln')) {
              const severity = script.output.toLowerCase().includes('critical') ? 'critical' :
                              script.output.toLowerCase().includes('high') ? 'high' :
                              script.output.toLowerCase().includes('medium') ? 'medium' : 'low';
              
              findings.push({
                id: uuidv4(),
                title: `Vulnerability: ${script.id}`,
                severity,
                description: script.output.substring(0, 500) + (script.output.length > 500 ? '...' : ''),
                remediation: 'Apply security patches and follow vendor recommendations.',
                affectedSystems: hostAddress,
                cvssScore: getCvssFromSeverity(severity),
                references: [
                  { title: 'Vulnerability Details', url: `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${script.id}` }
                ]
              });
            }
          }
        });
      }
      
      // If SSL/TLS is detected, check for weak ciphers
      if (scanType !== 'quick' && host.ports && host.ports.port) {
        const ports = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];
        const sslPorts = ports.filter(port => 
          (port.service && port.service.name === 'https') || 
          (port.service && port.service.name === 'ssl')
        );
        
        if (sslPorts.length > 0) {
          findings.push({
            id: uuidv4(),
            title: 'SSL/TLS Configuration Check Recommended',
            severity: 'medium',
            description: 'SSL/TLS services were detected. These should be checked for weak ciphers, outdated protocols, and certificate issues.',
            remediation: 'Run a dedicated SSL/TLS scanner to verify secure configuration.',
            affectedSystems: hostAddress,
            cvssScore: '5.3',
            references: [
              { title: 'SSL/TLS Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html' }
            ]
          });
        }
      }
    });
    
    // Calculate threat level based on findings
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
    
    return {
      findings,
      systemsScanned: hosts.length,
      totalIssues: findings.length,
      threatLevel
    };
  } catch (error) {
    console.error('Error parsing Nmap results:', error);
    return {
      findings: [],
      systemsScanned: 0,
      totalIssues: 0,
      threatLevel: 'none',
      error: 'Failed to parse scan results'
    };
  }
};

// Helper function to check for outdated service versions
const isOutdatedService = (serviceName, version) => {
  // This would be expanded with a comprehensive database of service versions
  const outdatedVersions = {
    'apache': ['1.', '2.0.', '2.2.'],
    'nginx': ['0.', '1.10.', '1.12.', '1.14.'],
    'openssh': ['4.', '5.', '6.', '7.0', '7.1', '7.2', '7.3'],
    'mysql': ['5.5.', '5.6.', '5.7.']
  };
  
  if (outdatedVersions[serviceName]) {
    return outdatedVersions[serviceName].some(outdated => version.startsWith(outdated));
  }
  
  return false;
};

// Check if OS is end-of-life
const isEolOperatingSystem = (osName) => {
  // This would be expanded with a comprehensive list
  const eolSystems = [
    'Windows XP', 'Windows Server 2003', 'Windows Server 2008', 'Windows 7',
    'Ubuntu 16.04', 'Ubuntu 14.04', 'Debian 8', 'CentOS 6', 'CentOS 7'
  ];
  
  return eolSystems.some(eol => osName.includes(eol));
};

// Map severity to CVSS score
const getCvssFromSeverity = (severity) => {
  switch (severity) {
    case 'critical': return '9.5';
    case 'high': return '7.5';
    case 'medium': return '5.0';
    case 'low': return '3.0';
    default: return '2.0';
  }
};

// Implement a real scan function
const startScan = (scanType = 'quick', targets = '127.0.0.1') => {
  try {
    // Validate scan type
    const validScanTypes = ['quick', 'standard', 'deep'];
    const normalizedScanType = scanType.toLowerCase();
    
    if (!validScanTypes.includes(normalizedScanType)) {
      throw new Error(`Invalid scan type: ${scanType}. Must be one of: ${validScanTypes.join(', ')}`);
    }
    
    // Create scan ID and prepare output directories
    const id = uuidv4();
    const scanPath = path.join(__dirname, '..', 'scans');
    
    if (!fs.existsSync(scanPath)) {
      try {
        fs.mkdirSync(scanPath, { recursive: true });
      } catch (err) {
        throw new Error(`Failed to create scan directory: ${err.message}`);
      }
    }
    
    const xmlOutputPath = path.join(scanPath, `${id}.xml`);
    const jsonOutputPath = path.join(scanPath, `${id}.json`);
    const parsedTargets = parseTargets(targets);
    
    // Get scan configuration
    const scanConfig = SCAN_CONFIGS[normalizedScanType.toUpperCase()];
    
    // Prepare actual Nmap command
    const args = [...scanConfig.nmapArgs, '-oX', xmlOutputPath, parsedTargets];
    
    // Log the command (for debugging)
    console.log(`Executing: nmap ${args.join(' ')}`);
    
    // Execute the Nmap command
    const nmapProcess = spawn('nmap', args);
    
    // Track process output for logging and progress tracking
    let outputBuffer = '';
    let errorBuffer = '';
    let hostCount = 0;
    let currentStage = 'Initializing scan';
    
    nmapProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      
      // Update stage based on nmap output
      if (output.includes('Initiating SYN Stealth Scan')) {
        currentStage = 'Port scanning';
      } else if (output.includes('Initiating Service scan')) {
        currentStage = 'Service detection';
      } else if (output.includes('Initiating OS detection')) {
        currentStage = 'OS detection';
      } else if (output.includes('Initiating NSE')) {
        currentStage = 'Script scanning';
      } else if (output.match(/Discovered open port \d+\/\w+/)) {
        currentStage = 'Port discovery';
      } else if (output.includes('Completed ')) {
        // Extract completion percentage
        const match = output.match(/Completed ([0-9.]+)%/);
        if (match && match[1]) {
          const progress = parseFloat(match[1]);
          if (scans[id]) {
            scans[id].progress = Math.min(progress, 99);
          }
        }
      }
      
      // Count hosts for better reporting
      if (output.includes('Host is up')) {
        hostCount++;
      }
      
      // Update scan stage
      if (scans[id]) {
        scans[id].stage = currentStage;
        scans[id].hostsFound = hostCount;
      }
    });
    
    nmapProcess.stderr.on('data', (data) => {
      errorBuffer += data.toString();
      console.error(`Nmap stderr: ${data.toString()}`);
    });
    
    // Handle scan completion
    nmapProcess.on('close', async (code) => {
      console.log(`Nmap scan completed with code ${code}`);
      
      if (!scans[id]) return; // Scan might have been deleted
      
      if (code !== 0) {
        scans[id].status = 'failed';
        scans[id].error = `Scan failed with exit code ${code}: ${errorBuffer}`;
        return;
      }
      
      try {
        // Parse the XML output
        const scanResults = await parseNmapResults(xmlOutputPath, normalizedScanType, parsedTargets);
        
        // Update scan status
        scans[id].status = 'completed';
        scans[id].progress = 100;
        scans[id].stage = 'Completed';
        scans[id].completedAt = new Date();
        scans[id].results = {
          scanId: id,
          systemsScanned: scanResults.systemsScanned,
          totalIssues: scanResults.totalIssues,
          threatLevel: scanResults.threatLevel,
          timestamp: Date.now(),
          findings: scanResults.findings
        };
        
        // Save results to JSON file
        fs.writeFileSync(jsonOutputPath, JSON.stringify(scans[id].results, null, 2));
      } catch (err) {
        console.error(`Failed to process scan results: ${err.message}`);
        scans[id].status = 'failed';
        scans[id].error = `Failed to process scan results: ${err.message}`;
      }
    });
    
    // Handle scan errors
    nmapProcess.on('error', (err) => {
      console.error(`Nmap execution error: ${err.message}`);
      
      if (scans[id]) {
        scans[id].status = 'failed';
        scans[id].error = `Failed to execute scan: ${err.message}`;
      }
    });
    
    // Store scan metadata
    scans[id] = {
      id,
      scanType: normalizedScanType,
      targets: parsedTargets,
      status: 'running',
      progress: 0,
      stage: 'Initializing',
      startedAt: new Date(),
      xmlOutputPath,
      jsonOutputPath,
      process: nmapProcess,
      hostsFound: 0
    };
    
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
    targetCount: scan.hostsFound || (scan.targets.includes('/') ? 'Multiple' : 1),
    error: scan.error
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
  if (scan.status === 'completed' && fs.existsSync(scan.jsonOutputPath)) {
    try {
      const fileData = fs.readFileSync(scan.jsonOutputPath, 'utf8');
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
  
  // Kill the Nmap process
  if (scan.process) {
    scan.process.kill();
  }
  
  scan.status = 'cancelled';
  scan.stage = 'Scan cancelled';
  return true;
};

// Clean up old scans
const cleanupOldScans = (maxAgeHours = 24) => {
  const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  
  Object.keys(scans).forEach(id => {
    const scan = scans[id];
    const scanDate = scan.completedAt || scan.startedAt;
    
    if (scanDate < cutoff) {
      // Clean up process
      if (scan.process && scan.status === 'running') {
        scan.process.kill();
      }
      
      // Remove result files
      if (fs.existsSync(scan.xmlOutputPath)) {
        try {
          fs.unlinkSync(scan.xmlOutputPath);
        } catch (err) {
          console.error(`Failed to delete scan XML file: ${err.message}`);
        }
      }
      
      if (fs.existsSync(scan.jsonOutputPath)) {
        try {
          fs.unlinkSync(scan.jsonOutputPath);
        } catch (err) {
          console.error(`Failed to delete scan JSON file: ${err.message}`);
        }
      }
      
      // Remove from memory
      delete scans[id];
    }
  });
};

// Get a list of recent scans (for history endpoint)
const getRecentScans = (limit = 10) => {
  return Object.values(scans)
    .sort((a, b) => (b.startedAt - a.startedAt))
    .slice(0, limit)
    .map(scan => ({
      id: scan.id,
      status: scan.status,
      scanType: scan.scanType,
      targets: scan.targets,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
      threatLevel: scan.results ? scan.results.threatLevel : null,
      totalIssues: scan.results ? scan.results.totalIssues : null
    }));
};

module.exports = { 
  startScan, 
  getScanStatus, 
  getScanResults, 
  cancelScan,
  cleanupOldScans,
  getRecentScans
};