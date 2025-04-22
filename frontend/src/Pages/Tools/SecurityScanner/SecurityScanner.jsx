import React, { useState, useEffect } from 'react';
import './SecurityScanner.css';

const SecurityScanner = () => {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [results, setResults] = useState(null);
  const [cveDetails, setCveDetails] = useState([]);
  const [error, setError] = useState(null);

  const performScan = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    // Reset states
    setScanning(true);
    setProgress(0);
    setResults(null);
    setCveDetails([]);
    setError(null);
    setScanStatus('Initializing scan...');

    try {
      // Clean the URL for processing
      const cleanUrl = url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      
      // Step 1: WHOIS Information
      setScanStatus('Gathering WHOIS information...');
      await simulateProgress(10);
      
      const whoisData = await fetchWhoisInfo(cleanUrl);
      
      // Step 2: DNS Records
      setScanStatus('Checking DNS records...');
      await simulateProgress(20);
      
      const dnsData = await fetchDnsRecords(cleanUrl);
      
      // Step 3: Port Scan
      setScanStatus('Running port scan...');
      await simulateProgress(40);
      
      const portData = await fetchOpenPorts(cleanUrl);
      
      // Step 4: SSL/TLS Check
      setScanStatus('Checking SSL/TLS security...');
      await simulateProgress(60);
      
      const sslData = await fetchSslInfo(cleanUrl);
      
      // Step 5: HTTP Headers
      setScanStatus('Analyzing HTTP headers...');
      await simulateProgress(80);
      
      const headersData = await fetchHttpHeaders(cleanUrl);
      
      // Step 6: Fingerprinting web technologies
      setScanStatus('Fingerprinting web technologies...');
      await simulateProgress(90);
      
      const techData = await fetchWebTech(cleanUrl);
      
      // Step 7: Map vulnerabilities with NIST
      setScanStatus('Mapping vulnerabilities to NIST database...');
      await simulateProgress(95);
      
      // Check for CVEs based on detected technologies
      let cveList = [];
      if (techData.applications && techData.applications.length > 0) {
        // Get the first detected server technology
        const serverTech = techData.applications.find(app => 
          app.categories && app.categories.includes('web-servers'));
        
        if (serverTech) {
          // Fetch CVEs from NIST for detected server
          cveList = await fetchNistCVEs(serverTech.name, serverTech.version);
          setCveDetails(cveList);
        }
      }
      
      // Compile full results
      const scanResults = {
        timestamp: new Date().toISOString(),
        target: cleanUrl,
        whois: whoisData,
        dns: dnsData,
        ports: portData,
        ssl: sslData,
        headers: headersData,
        technologies: techData,
        vulnerabilities: cveList
      };
      
      setResults(scanResults);
      setScanStatus('Scan complete!');
      setProgress(100);
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
      setScanStatus('Error occurred during scan');
    } finally {
      setScanning(false);
    }
  };

  // Helper function to simulate progress between API calls
  const simulateProgress = async (targetProgress) => {
    const start = progress;
    const increment = (targetProgress - start) / 10;
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(start + increment * (i + 1));
    }
  };

  // Fetch WHOIS information 
  const fetchWhoisInfo = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/whois?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`WHOIS API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching WHOIS:", error);
      
      // Return minimal data structure
      return {
        domainName: domain,
        registrar: 'Could not retrieve',
        creationDate: 'Could not retrieve',
        expirationDate: 'Could not retrieve',
        registrantCountry: 'Could not retrieve',
        nameServers: []
      };
    }
  };

  // Fetch DNS records
  const fetchDnsRecords = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/dns?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`DNS API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching DNS records:", error);
      return {
        aRecords: [],
        mxRecords: [],
        txtRecords: [],
        nsRecords: [],
        subdomains: []
      };
    }
  };

  // Fetch port scan data
  const fetchOpenPorts = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/ports?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`Port scan error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error scanning ports:", error);
      
      // Fallback to basic HTTP/HTTPS check
      try {
        // Check HTTP
        const httpPromise = fetch(`http://${domain}`, { method: 'HEAD', mode: 'no-cors', timeout: 3000 })
          .then(() => ({ port: 80, service: 'http', state: 'open' }))
          .catch(() => null);
        
        // Check HTTPS
        const httpsPromise = fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors', timeout: 3000 })
          .then(() => ({ port: 443, service: 'https', state: 'open' }))
          .catch(() => null);
        
        const [httpResult, httpsResult] = await Promise.all([httpPromise, httpsPromise]);
        const openPorts = [httpResult, httpsResult].filter(Boolean);
        
        return { openPorts };
      } catch (e) {
        console.error("Error with fallback port scan:", e);
        return { openPorts: [] };
      }
    }
  };

  // Fetch SSL/TLS information
  const fetchSslInfo = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/ssl?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`SSL check error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching SSL info:", error);
      
      // Fallback to basic HTTPS check
      try {
        const response = await fetch(`https://${domain}`, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        return {
          versions: ['TLS (version unknown)'],
          weakCiphers: 'Could not determine',
          expiryDate: 'Could not determine',
          issuer: 'Could not determine',
          grade: 'Could not determine'
        };
      } catch (e) {
        return {
          versions: ['HTTPS not available'],
          weakCiphers: 'N/A',
          expiryDate: 'N/A',
          issuer: 'N/A',
          grade: 'N/A'
        };
      }
    }
  };

  // Fetch HTTP headers
  const fetchHttpHeaders = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/headers?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`HTTP header check error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching HTTP headers:", error);
      return {
        'Note': 'Could not retrieve security headers'
      };
    }
  };

  // Fetch web technology information
  const fetchWebTech = async (domain) => {
    try {
      // Updated to use localhost:5000
      const response = await fetch(`http://localhost:5300/api/technologies?domain=${domain}`);
      
      if (!response.ok) {
        throw new Error(`Technology detection error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching web technologies:", error);
      
      // Basic fallback
      try {
        const response = await fetch(`https://${domain}`, { mode: 'no-cors' });
        const server = response.headers.get('Server') || 'Unknown';
        
        return {
          applications: [],
          server,
          cms: 'Unknown',
          framework: 'Unknown',
          libraries: []
        };
      } catch (fetchError) {
        return {
          applications: [],
          server: 'Unknown',
          cms: 'Unknown',
          framework: 'Unknown',
          libraries: []
        };
      }
    }
  };

  // Fetch CVEs from NIST NVD API
// Fix the fetchNistCVEs function in the SecurityScanner component
const fetchNistCVEs = async (product, version) => {
  try {
    // Updated to use localhost:5300
    const response = await fetch(
      `http://localhost:5300/api/cve?product=${encodeURIComponent(product)}&version=${encodeURIComponent(version || '')}`
    );
    
    if (!response.ok) {
      throw new Error(`CVE lookup error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the results array from the response data structure
    // The backend returns { results: [...], message: "..." }
    return data.results || [];
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    return [];
  }
};

  // Format the scan results as text for download
  const formatResultsText = () => {
    if (!results) return '';
    
    const r = results;
    let text = `🔍 Running External Security Assessment on: ${r.target}\n`;
    text += `Results saved to: scan_results_${r.target}.txt\n`;
    text += '=========================================\n';
    
    // WHOIS Information
    text += '📄 WHOIS Information\n';
    text += '=========================================\n';
    text += `Domain Name: ${r.whois.domainName}\n`;
    text += `Registrar: ${r.whois.registrar}\n`;
    text += `Creation Date: ${r.whois.creationDate}\n`;
    text += `Expiration Date: ${r.whois.expirationDate}\n`;
    text += `Registrant Country: ${r.whois.registrantCountry}\n`;
    text += `Name Servers: ${r.whois.nameServers.join(', ')}\n`;
    text += '=========================================\n';
    
    // DNS Records
    text += '🌐 DNS Records\n';
    text += '=========================================\n';
    text += `A Record: ${r.dns.aRecords.join(', ') || 'None found'}\n`;
    text += `MX Record: ${r.dns.mxRecords.join(', ') || 'None found'}\n`;
    text += `TXT Record: ${r.dns.txtRecords.join(', ') || 'None found'}\n`;
    text += `NS Record: ${r.dns.nsRecords.join(', ') || 'None found'}\n`;
    text += '=========================================\n';
    
    // Subdomain Enumeration
    text += '🔎 Subdomain Enumeration\n';
    text += '=========================================\n';
    if (r.dns.subdomains && r.dns.subdomains.length > 0) {
      r.dns.subdomains.forEach(sub => {
        text += `${sub}\n`;
      });
    } else {
      text += 'No subdomains detected\n';
    }
    text += '=========================================\n';
    
    // SSL/TLS Security
    text += '🔒 SSL/TLS Security Check\n';
    text += '=========================================\n';
    text += `SSL/TLS Version: ${r.ssl.versions.join(', ')}\n`;
    text += `Weak Ciphers: ${r.ssl.weakCiphers}\n`;
    text += `Certificate Expiry: Expires on ${r.ssl.expiryDate}\n`;
    text += `Issuer: ${r.ssl.issuer}\n`;
    text += `SSL Grade: ${r.ssl.grade || 'N/A'}\n`;
    text += '=========================================\n';
    
    // HTTP Headers
    text += '🛡️ HTTP Security Headers Audit\n';
    text += '=========================================\n';
    if (Object.keys(r.headers).length > 0) {
      Object.entries(r.headers).forEach(([key, value]) => {
        text += `${key}: ${value}\n`;
      });
    } else {
      text += 'No security headers detected\n';
    }
    text += '=========================================\n';
    
    // Open Ports
    text += '🚪 Open Ports & Firewall Scan\n';
    text += '=========================================\n';
    text += 'PORT     STATE    SERVICE\n';
    if (r.ports.openPorts && r.ports.openPorts.length > 0) {
      r.ports.openPorts.forEach(port => {
        text += `${port.port.toString().padEnd(8)}${port.state.padEnd(8)}${port.service}\n`;
      });
      
      // Check for potentially risky open ports
      const riskyPorts = [21, 22, 3306, 3389, 5432, 6379, 27017];
      const openRiskyPorts = r.ports.openPorts.filter(p => riskyPorts.includes(p.port));
      
      if (openRiskyPorts.length > 0) {
        text += '\nPotential security risks:\n';
        openRiskyPorts.forEach(port => {
          text += `Warning: Port ${port.port} (${port.service}) may expose sensitive services to the internet!\n`;
        });
      }
    } else {
      text += 'No open ports detected\n';
    }
    text += '=========================================\n';
    
    // Web Technologies
    text += '🕵️ Web Technology Fingerprinting\n';
    text += '=========================================\n';
    text += `Powered by: ${r.technologies.server}\n`;
    text += `CMS: ${r.technologies.cms}\n`;
    text += `Framework: ${r.technologies.framework}\n`;
    text += `Detected Libraries: ${r.technologies.libraries.join(', ') || 'None detected'}\n`;
    text += '=========================================\n';
    
    // CVE Mapping
    text += '🔎 CVE Mapping (via NIST API)\n';
    text += '=========================================\n';
    if (r.vulnerabilities && r.vulnerabilities.length > 0) {
      text += `[1] ${r.technologies.server} detected - Known vulnerabilities:\n`;
      r.vulnerabilities.forEach(vuln => {
        text += `    - ${vuln.id} (${vuln.severity}) - ${vuln.description.substring(0, 100)}...\n`;
      });
    } else {
      text += 'No vulnerabilities found in NIST database for detected technologies.\n';
    }
    text += '=========================================\n';
    text += '✅ Scan Complete!\n';
    
    return text;
  };

  // Generate and download results file
  const downloadResults = () => {
    if (!results) return;
    
    const resultsText = formatResultsText();
    const blob = new Blob([resultsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_results_${results.target}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Calculate security score based on results
  const calculateSecurityScore = () => {
    if (!results) return 0;
    
    let score = 0;
    let maxScore = 100;
    
    // Score based on SSL/TLS (0-25 points)
    if (results.ssl) {
      // SSL Grade
      if (results.ssl.grade === 'A+') score += 25;
      else if (results.ssl.grade === 'A') score += 20;
      else if (results.ssl.grade === 'B') score += 15;
      else if (results.ssl.grade === 'C') score += 10;
      else if (results.ssl.grade === 'D') score += 5;
      else if (results.ssl.grade === 'F') score += 0;
      else score += 10; // Unknown grade
      
      // Weak ciphers penalty
      if (results.ssl.weakCiphers !== 'None detected') score -= 10;
    }
    
    // Score based on HTTP headers (0-25 points)
    if (results.headers) {
      const securityHeaders = [
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-XSS-Protection',
        'X-Content-Type-Options',
        'Content-Security-Policy',
        'Referrer-Policy'
      ];
      
      // 4 points per security header
      securityHeaders.forEach(header => {
        if (results.headers[header]) score += 4;
      });
      
      // Cap at 25 points
      score = Math.min(score, 25);
    }
    
    // Score based on open ports (0-25 points)
    if (results.ports && results.ports.openPorts) {
      // Start with 25 and deduct for risky ports
      let portScore = 25;
      
      const riskyPorts = [21, 22, 23, 25, 3306, 3389, 5432, 6379, 27017];
      const openRiskyPorts = results.ports.openPorts.filter(p => riskyPorts.includes(p.port));
      
      // -5 points per risky port
      portScore -= openRiskyPorts.length * 5;
      
      // Minimum of 0
      score += Math.max(0, portScore);
    }
    
    // Score based on vulnerabilities (0-25 points)
    if (results.vulnerabilities) {
      let vulnScore = 25;
      
      // Count critical and high severity issues
      const criticalVulns = results.vulnerabilities.filter(v => 
        v.severity === 'CRITICAL' || v.severity === 'HIGH'
      );
      
      // -5 points per critical/high vulnerability
      vulnScore -= criticalVulns.length * 5;
      
      // Count medium severity issues
      const mediumVulns = results.vulnerabilities.filter(v => v.severity === 'MEDIUM');
      
      // -2 points per medium vulnerability
      vulnScore -= mediumVulns.length * 2;
      
      // Minimum of 0
      score += Math.max(0, vulnScore);
    }
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // Get color for security score
  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  useEffect(() => {
    // Track progress when scanning state changes
    if (!scanning) {
      setProgress(100);
    }
  }, [scanning]);

  return (
    <div className="security-scanner">
      <div className="scanner-header">
        <h1>External Security Scanner</h1>
        <p>Perform a comprehensive security assessment on any web domain</p>
      </div>
      
      <div className="scan-form">
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter domain (e.g., example.com)"
            disabled={scanning}
          />
          <button 
            className="scan-button"
            onClick={performScan}
            disabled={scanning || !url}
          >
            {scanning ? 'Scanning...' : 'Start Scan'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      {scanning && (
        <div className="scan-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="scan-status">{scanStatus}</div>
        </div>
      )}
      
      {results && (
        <div className="scan-results">
          <div className="results-header">
            <h2>Scan Results for {results.target}</h2>
            <div className="score-container">
              <div 
                className="security-score" 
                style={{ 
                  backgroundColor: getScoreColor(calculateSecurityScore()) 
                }}
              >
                {calculateSecurityScore()}
              </div>
              <div className="score-label">Security Score</div>
            </div>
            <button className="download-button" onClick={downloadResults}>
              Download Report
            </button>
          </div>
          
          <div className="results-grid">
            {/* WHOIS Information */}
            <div className="result-card">
              <h3>📄 WHOIS Information</h3>
              <div className="card-content">
                <div><strong>Domain:</strong> {results.whois.domainName}</div>
                <div><strong>Registrar:</strong> {results.whois.registrar}</div>
                <div><strong>Created:</strong> {results.whois.creationDate}</div>
                <div><strong>Expires:</strong> {results.whois.expirationDate}</div>
                <div><strong>Registrant Country:</strong> {results.whois.registrantCountry}</div>
              </div>
            </div>
            
            {/* DNS Records */}
            <div className="result-card">
              <h3>🌐 DNS Records</h3>
              <div className="card-content">
                <div><strong>A Records:</strong> {results.dns.aRecords.join(', ') || 'None found'}</div>
                <div><strong>MX Records:</strong> {results.dns.mxRecords.join(', ') || 'None found'}</div>
                <div><strong>TXT Records:</strong> {results.dns.txtRecords.length > 0 ? `${results.dns.txtRecords.length} found` : 'None found'}</div>
                <div><strong>NS Records:</strong> {results.dns.nsRecords.join(', ') || 'None found'}</div>
                <div><strong>Subdomains:</strong> {results.dns.subdomains.length > 0 ? `${results.dns.subdomains.length} found` : 'None found'}</div>
              </div>
            </div>
            
            {/* Open Ports */}
            <div className="result-card">
              <h3>🚪 Open Ports</h3>
              <div className="card-content">
                <table className="ports-table">
                  <thead>
                    <tr>
                      <th>Port</th>
                      <th>State</th>
                      <th>Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.ports.openPorts && results.ports.openPorts.length > 0 ? (
                      results.ports.openPorts.map((port, index) => (
                        <tr key={index}>
                          <td>{port.port}</td>
                          <td>{port.state}</td>
                          <td>{port.service}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No open ports detected</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* SSL/TLS Security */}
            <div className="result-card">
              <h3>🔒 SSL/TLS Security</h3>
              <div className="card-content">
                <div className={`ssl-grade ${results.ssl.grade?.toLowerCase() || 'unknown'}`}>
                  <strong>Grade: {results.ssl.grade || 'Unknown'}</strong>
                </div>
                <div><strong>Version:</strong> {results.ssl.versions.join(', ')}</div>
                <div><strong>Expires:</strong> {results.ssl.expiryDate}</div>
                <div><strong>Issuer:</strong> {results.ssl.issuer}</div>
                <div className={results.ssl.weakCiphers === 'None detected' ? 'secure' : 'warning'}>
                  <strong>Weak Ciphers:</strong> {results.ssl.weakCiphers}
                </div>
              </div>
            </div>
            
            {/* Security Headers */}
            <div className="result-card">
              <h3>🛡️ HTTP Security Headers</h3>
              <div className="card-content">
                {Object.keys(results.headers).length > 0 ? (
                  <table className="headers-table">
                    <thead>
                      <tr>
                        <th>Header</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.headers).map(([key, value], index) => (
                        <tr key={index}>
                          <td>{key}</td>
                          <td className="header-value">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="warning">No security headers detected</div>
                )}
              </div>
            </div>
            
            {/* Web Technologies */}
            <div className="result-card">
              <h3>🕵️ Web Technologies</h3>
              <div className="card-content">
                <div><strong>Server:</strong> {results.technologies.server}</div>
                <div><strong>CMS:</strong> {results.technologies.cms}</div>
                <div><strong>Framework:</strong> {results.technologies.framework}</div>
                <div className="libraries">
                  <strong>Libraries:</strong> 
                  {results.technologies.libraries.length > 0 ? (
                    <ul>
                      {results.technologies.libraries.map((lib, index) => (
                        <li key={index}>{lib}</li>
                      ))}
                    </ul>
                  ) : (
                    ' None detected'
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* CVE Vulnerabilities */}
          {cveDetails.length > 0 && (
            <div className="vulnerabilities-section">
              <h3>🔎 Known Vulnerabilities</h3>
              <div className="vulnerabilities-list">
                {cveDetails.map((vuln, index) => (
                  <div key={index} className={`vulnerability-card ${vuln.severity.toLowerCase()}`}>
                    <div className="vuln-header">
                      <div className="vuln-id">{vuln.id}</div>
                      <div className={`vuln-severity ${vuln.severity.toLowerCase()}`}>
                        {vuln.severity} ({vuln.score})
                      </div>
                    </div>
                    <div className="vuln-description">{vuln.description}</div>
                    <div className="vuln-dates">
                      Published: {new Date(vuln.published).toLocaleDateString()}
                    </div>
                    {vuln.references && vuln.references.length > 0 && (
                      <div className="vuln-references">
                        <strong>References:</strong>
                        <ul>
                          {vuln.references.slice(0, 3).map((ref, idx) => (
                            <li key={idx}>
                              <a href={ref} target="_blank" rel="noopener noreferrer">
                                {ref.substring(0, 50)}...
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Security Recommendations */}
          <div className="recommendations-section">
            <h3>🛠️ Security Recommendations</h3>
            <div className="recommendations-list">
              {results.ssl.grade && (results.ssl.grade === 'C' || results.ssl.grade === 'D' || results.ssl.grade === 'F') && (
                <div className="recommendation-item warning">
                  <h4>Improve SSL/TLS Configuration</h4>
                  <p>Your SSL/TLS configuration received a low grade ({results.ssl.grade}). Consider updating your SSL configuration to use only strong ciphers and the latest protocol versions.</p>
                </div>
              )}
              
              {(!results.headers['Strict-Transport-Security']) && (
                <div className="recommendation-item warning">
                  <h4>Add HTTP Strict Transport Security (HSTS)</h4>
                  <p>HSTS header is missing. This header helps protect against protocol downgrade attacks and cookie hijacking.</p>
                </div>
              )}
              
              {(!results.headers['Content-Security-Policy']) && (
                <div className="recommendation-item warning">
                  <h4>Implement Content Security Policy</h4>
                  <p>CSP header is missing. This header helps prevent XSS attacks by restricting which resources can be loaded.</p>
                </div>
              )}
              
              {cveDetails.length > 0 && (
                <div className="recommendation-item critical">
                  <h4>Update Software to Fix Vulnerabilities</h4>
                  <p>{cveDetails.length} vulnerabilities were found in your web technologies. Update to the latest patched versions to mitigate these security risks.</p>
                </div>
              )}
              
              {results.ports.openPorts && results.ports.openPorts.some(p => [21, 22, 3306, 3389, 5432, 6379, 27017].includes(p.port)) && (
                <div className="recommendation-item warning">
                  <h4>Restrict Access to Sensitive Ports</h4>
                  <p>Several potentially sensitive ports were found open. Consider limiting access to these ports through firewall rules or closing them if they're not necessary.</p>
                </div>
              )}
              
              {(!results.headers['X-Frame-Options']) && (
                <div className="recommendation-item info">
                  <h4>Set X-Frame-Options Header</h4>
                  <p>X-Frame-Options header is missing. This header prevents your site from being embedded in frames, which helps prevent clickjacking attacks.</p>
                </div>
              )}
              
              {(!results.headers['X-Content-Type-Options']) && (
                <div className="recommendation-item info">
                  <h4>Set X-Content-Type-Options Header</h4>
                  <p>X-Content-Type-Options header is missing. This header prevents MIME type sniffing which can help prevent certain attacks.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="scanner-footer">
        <p>This scanner performs non-intrusive security checks on publicly available information.</p>
        <p>For more comprehensive security assessments, consider using professional penetration testing services.</p>
      </div>
    </div>
  );
};

export default SecurityScanner;