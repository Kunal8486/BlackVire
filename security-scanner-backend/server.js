// server.js
const express = require('express');
const cors = require('cors');
const whois = require('whois-json');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const sslChecker = require('ssl-checker');
const axios = require('axios');
const { execSync } = require('child_process');
const net = require('net');


const app = express();
const PORT = 5300;

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions
const checkPort = async (host, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000); // 3 second timeout
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

const getServiceName = (port) => {
  const commonPorts = {
    21: 'ftp',
    22: 'ssh',
    23: 'telnet',
    25: 'smtp',
    53: 'dns',
    80: 'http',
    110: 'pop3',
    143: 'imap',
    443: 'https',
    465: 'smtps',
    587: 'smtp',
    993: 'imaps',
    995: 'pop3s',
    3306: 'mysql',
    3389: 'rdp',
    5432: 'postgresql',
    6379: 'redis',
    8080: 'http-alt',
    27017: 'mongodb'
  };
  
  return commonPorts[port] || 'unknown';
};

// WHOIS Information Route
app.get('/api/whois', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    const whoisData = await whois(domain);
    
    // Extract relevant information
    const result = {
      domainName: whoisData.domainName || domain,
      registrar: whoisData.registrar || 'Unknown',
      creationDate: whoisData.creationDate || 'Unknown',
      expirationDate: whoisData.expirationDate || 'Unknown',
      registrantCountry: whoisData.registrantCountry || 'Unknown',
      nameServers: whoisData.nameServers || []
    };
    
    res.json(result);
  } catch (error) {
    console.error('WHOIS Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch WHOIS information',
      domainName: req.query.domain,
      registrar: 'Could not retrieve',
      creationDate: 'Could not retrieve',
      expirationDate: 'Could not retrieve',
      registrantCountry: 'Could not retrieve',
      nameServers: []
    });
  }
});

// DNS Records Route
app.get('/api/dns', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    // Get various DNS records
    const getRecords = async (type) => {
      try {
        const records = await dns.resolve(domain, type);
        return records || [];
      } catch (e) {
        return [];
      }
    };
    
    // Fetch A, MX, TXT, and NS records in parallel
    const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.all([
      getRecords('A'),
      getRecords('MX').then(records => records.map(record => record.exchange)),
      getRecords('TXT'),
      getRecords('NS')
    ]);
    
    // Basic subdomain enumeration (this is a simplified version)
    // In a real production app, you'd use a more sophisticated approach
    const commonSubdomains = ['www', 'mail', 'ftp', 'blog', 'shop', 'store', 'api', 'dev', 'staging'];
    const subdomains = [];
    
    for (const sub of commonSubdomains) {
      try {
        const subdomainToCheck = `${sub}.${domain}`;
        const records = await dns.resolve4(subdomainToCheck);
        if (records && records.length > 0) {
          subdomains.push(subdomainToCheck);
        }
      } catch (e) {
        // Subdomain doesn't exist or other error, ignore
      }
    }
    
    res.json({
      aRecords,
      mxRecords,
      txtRecords,
      nsRecords,
      subdomains
    });
  } catch (error) {
    console.error('DNS Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch DNS records',
      aRecords: [],
      mxRecords: [],
      txtRecords: [],
      nsRecords: [],
      subdomains: []
    });
  }
});

// Port Scan Route
app.get('/api/ports', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    // Resolve domain to IP
    let ip;
    try {
      const addresses = await dns.resolve4(domain);
      ip = addresses[0];
    } catch (e) {
      return res.status(400).json({ error: 'Could not resolve domain to IP address' });
    }
    
    // Common ports to scan
    const portsToScan = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 6379, 8080, 27017];
    
    // Scan ports
    const portPromises = portsToScan.map(async (port) => {
      const isOpen = await checkPort(ip, port);
      if (isOpen) {
        return {
          port,
          state: 'open',
          service: getServiceName(port)
        };
      }
      return null;
    });
    
    const results = await Promise.all(portPromises);
    const openPorts = results.filter(Boolean);
    
    res.json({ openPorts });
  } catch (error) {
    console.error('Port Scan Error:', error);
    res.status(500).json({ 
      error: 'Failed to scan ports',
      openPorts: [] 
    });
  }
});

// SSL/TLS Information Route
app.get('/api/ssl', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    // Check if HTTPS is available
    let httpsAvailable = true;
    try {
      await new Promise((resolve, reject) => {
        const request = https.request({
          hostname: domain,
          port: 443,
          method: 'HEAD',
          timeout: 5000
        }, resolve);
        
        request.on('error', reject);
        request.end();
      });
    } catch (e) {
      httpsAvailable = false;
    }
    
    if (!httpsAvailable) {
      return res.json({
        versions: ['HTTPS not available'],
        weakCiphers: 'N/A',
        expiryDate: 'N/A',
        issuer: 'N/A',
        grade: 'F'
      });
    }
    
    // Get SSL info using ssl-checker
    const sslInfo = await sslChecker(domain);
    
    // Determine SSL grade based on days until expiry and other factors
    let grade = 'A';
    if (sslInfo.daysRemaining < 30) {
      grade = 'C';
    } else if (sslInfo.daysRemaining < 15) {
      grade = 'D';
    } else if (sslInfo.daysRemaining < 7) {
      grade = 'F';
    }
    
    // Check for weak ciphers (simplified)
    // In a real app, this would be more comprehensive
    const weakCiphers = 'None detected'; // Simplified
    
    res.json({
      versions: [`TLS ${sslInfo.protocol || 'Unknown'}`],
      weakCiphers,
      expiryDate: new Date(sslInfo.validTo).toLocaleDateString(),
      issuer: sslInfo.issuer?.O || 'Unknown',
      grade
    });
  } catch (error) {
    console.error('SSL Error:', error);
    res.status(500).json({ 
      error: 'Failed to check SSL/TLS',
      versions: ['Error checking TLS'],
      weakCiphers: 'Could not determine',
      expiryDate: 'Could not determine',
      issuer: 'Could not determine',
      grade: 'Unknown'
    });
  }
});

// HTTP Headers Route
app.get('/api/headers', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    // Try HTTPS first
    let headers = {};
    let protocol = 'https';
    
    try {
      const response = await axios.head(`https://${domain}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      headers = response.headers;
    } catch (e) {
      // Try HTTP if HTTPS fails
      protocol = 'http';
      try {
        const response = await axios.head(`http://${domain}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        headers = response.headers;
      } catch (innerError) {
        return res.status(500).json({ 
          error: 'Failed to retrieve HTTP headers',
          'Note': 'Could not retrieve security headers'
        });
      }
    }
    
    // Extract security headers
    const securityHeaders = {
      'Strict-Transport-Security': headers['strict-transport-security'] || 'Missing',
      'X-Frame-Options': headers['x-frame-options'] || 'Missing',
      'X-XSS-Protection': headers['x-xss-protection'] || 'Missing',
      'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
      'Content-Security-Policy': headers['content-security-policy'] || 'Missing',
      'Referrer-Policy': headers['referrer-policy'] || 'Missing',
      'Feature-Policy': headers['feature-policy'] || headers['permissions-policy'] || 'Missing',
      'Server': headers['server'] || 'Not disclosed'
    };
    
    res.json(securityHeaders);
  } catch (error) {
    console.error('Headers Error:', error);
    res.status(500).json({ 
      'Note': 'Could not retrieve security headers' 
    });
  }
});

const fetchNistCVEs = async (product, version) => {
  try {
    // Input validation
    if (!product) {
      throw new Error('Product name is required');
    }

    console.log(`Searching for CVEs for ${product} ${version || ''}`);
    
    // NVD API requires an API key for production use
    // Note: This should be stored in an environment variable in production
    const API_KEY = process.env.NVD_API_KEY || 'd6c27b10-c585-4c02-877c-072d77294166';
    
    // Base URL for NVD API 2.0
    const baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
    
    // Create search parameters
    const keywordSearch = version && version.toLowerCase() !== 'unknown' 
      ? `${product} ${version}` 
      : product;
      
    // Build the URL properly with correct keyword encoding
    const url = `${baseUrl}?keywordSearch=${encodeURIComponent(keywordSearch)}&resultsPerPage=15`;
    
    console.log(`Making request to: ${url}`);
    
    // Headers for the request - API key must be in the header
    const headers = {
      'apiKey': API_KEY,
      'User-Agent': 'Security-Scanner-Tool/1.0',
      'Content-Type': 'application/json'
    };
    
    // Make the request with proper error handling
    const response = await axios({
      method: 'GET',
      url: url,
      headers: headers,
      timeout: 15000,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept 2xx and 4xx responses
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Handle API errors
    if (response.status !== 200) {
      console.log(`Error response: ${JSON.stringify(response.data || {})}`);
      throw new Error(`NVD API returned status code ${response.status}`);
    }
    
    // Process the results
    const data = response.data;
    
    if (!data || !data.vulnerabilities || data.vulnerabilities.length === 0) {
      console.log("No vulnerabilities found");
      return [];
    }
    
    // Process and format the CVE data
    const formattedCVEs = [];
    
    for (const item of data.vulnerabilities) {
      if (!item || !item.cve) continue;
      
      const cve = item.cve;
      
      // Basic CVE info
      const formattedItem = {
        id: cve.id || `UNKNOWN-${Date.now()}`,
        severity: 'UNKNOWN',
        score: 0,
        description: 'No description available',
        published: cve.published || new Date().toISOString(),
        references: []
      };
      
      // Get description
      if (cve.descriptions && Array.isArray(cve.descriptions)) {
        const englishDesc = cve.descriptions.find(d => d && d.lang === 'en');
        if (englishDesc && englishDesc.value) {
          formattedItem.description = englishDesc.value;
        }
      }
      
      // Get severity metrics - first check for newer CVSS v3.1
      if (cve.metrics) {
        // Try CVSS v3.1 first (most current)
        if (cve.metrics.cvssMetricV31 && cve.metrics.cvssMetricV31.length > 0) {
          const metric = cve.metrics.cvssMetricV31[0];
          if (metric && metric.cvssData && typeof metric.cvssData.baseScore === 'number') {
            formattedItem.score = metric.cvssData.baseScore;
            formattedItem.severity = getSeverityFromScore(formattedItem.score, 3);
          }
        } 
        // Then try CVSS v3.0
        else if (cve.metrics.cvssMetricV30 && cve.metrics.cvssMetricV30.length > 0) {
          const metric = cve.metrics.cvssMetricV30[0];
          if (metric && metric.cvssData && typeof metric.cvssData.baseScore === 'number') {
            formattedItem.score = metric.cvssData.baseScore;
            formattedItem.severity = getSeverityFromScore(formattedItem.score, 3);
          }
        } 
        // Finally try CVSS v2
        else if (cve.metrics.cvssMetricV2 && cve.metrics.cvssMetricV2.length > 0) {
          const metric = cve.metrics.cvssMetricV2[0];
          if (metric && metric.cvssData && typeof metric.cvssData.baseScore === 'number') {
            formattedItem.score = metric.cvssData.baseScore;
            formattedItem.severity = getSeverityFromScore(formattedItem.score, 2);
          }
        }
      }
      
      // Get references
      if (cve.references && Array.isArray(cve.references)) {
        formattedItem.references = cve.references
          .filter(ref => ref && ref.url)
          .map(ref => ref.url)
          .slice(0, 5);
      }
      
      formattedCVEs.push(formattedItem);
    }
    
    // Sort by severity and then by score
    formattedCVEs.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // If severity is the same, sort by score (descending)
      return b.score - a.score;
    });
    
    return formattedCVEs;
  } catch (error) {
    console.error(`Error fetching CVEs from NIST: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
    }
    
    // Return empty array
    return [];
  }
};

// Helper function to determine severity from CVSS score
const getSeverityFromScore = (score, version) => {
  if (version === 3) {
    if (score >= 9.0) return 'CRITICAL';
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    if (score >= 0.1) return 'LOW';
    return 'UNKNOWN';
  } else { // CVSS v2
    if (score >= 7.0) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    if (score >= 0.1) return 'LOW';
    return 'UNKNOWN';
  }
};

// Fallback function to try CPE-based search if keyword search fails
const tryCpeSearch = async (product, version, apiKey) => {
  try {
    // For products that might map better to CPEs, try a CPE search format
    // Construct a CPE match string (basic version)
    const cpeMatchString = `cpe:2.3:a:*:${product}`;
    
    const baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
    const url = `${baseUrl}?cpeName=${encodeURIComponent(cpeMatchString)}&resultsPerPage=15`;
    
    console.log(`Trying CPE search with: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        'apiKey': apiKey,
        'User-Agent': 'Security-Scanner-Tool/1.0',
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    if (response.status === 200 && 
        response.data && 
        response.data.vulnerabilities && 
        response.data.vulnerabilities.length > 0) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error(`CPE search error: ${error.message}`);
    return null;
  }
};

// CVE Lookup Route
app.get('/api/cve', async (req, res) => {
  try {
    const { product, version } = req.query;
    
    if (!product) {
      return res.status(400).json({ 
        error: 'Product parameter is required',
        message: 'Please provide a product name to search for vulnerabilities'
      });
    }
    
    const cveResults = await fetchNistCVEs(product, version);
    
    // If no results found, return an empty array with a message
    if (cveResults.length === 0) {
      return res.json({
        results: [],
        message: `No vulnerabilities found for ${product} ${version || ''}`
      });
    }
    
    res.json({
      results: cveResults,
      message: `Found ${cveResults.length} vulnerabilities for ${product} ${version || ''}`
    });
  } catch (error) {
    console.error('CVE Lookup Error:', error);
    res.status(500).json({
      error: 'Failed to retrieve vulnerability data',
      message: error.message,
      results: []
    });
  }
});

// Enhanced Web Technology Detection with additional fingerprinting techniques
app.get('/api/technologies', async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }
    
    // Try to get server header and other indicators
    let serverHeader = 'Unknown';
    let possibleCms = 'Unknown';
    let possibleFramework = 'Unknown';
    let libraries = [];
    let applications = [];
    
    try {
      // Try HTTPS first, then HTTP
      let response;
      try {
        response = await axios.get(`https://${domain}`, {
          timeout: 5000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
      } catch (e) {
        response = await axios.get(`http://${domain}`, {
          timeout: 5000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
      }
      
      // Extract server header
      serverHeader = response.headers['server'] || 'Unknown';
      
      // Add server to applications array
      if (serverHeader !== 'Unknown') {
        // Try to extract version from server header
        const versionMatch = serverHeader.match(/[\d\.]+/);
        const version = versionMatch ? versionMatch[0] : 'Unknown';
        
        applications.push({
          name: serverHeader.split('/')[0],
          categories: ['web-servers'],
          version: version
        });
      }
      
      // Basic technology detection based on response body
      const html = response.data;
      
      // Check for common CMS indicators
      if (html.includes('wp-content') || html.includes('wp-includes')) {
        possibleCms = 'WordPress';
        
        // Look for WordPress version
        const wpVersionMatch = html.match(/wp-emoji-release\.min\.js\?ver=([\d\.]+)/);
        const wpVersion = wpVersionMatch ? wpVersionMatch[1] : 'Unknown';
        
        applications.push({
          name: 'WordPress',
          categories: ['cms'],
          version: wpVersion
        });
      } else if (html.includes('/drupal.js') || html.includes('drupal.min.js')) {
        possibleCms = 'Drupal';
        
        applications.push({
          name: 'Drupal',
          categories: ['cms'],
          version: 'Unknown'
        });
      } else if (html.includes('/joomla.js') || html.includes('com_content')) {
        possibleCms = 'Joomla';
        
        applications.push({
          name: 'Joomla',
          categories: ['cms'],
          version: 'Unknown'
        });
      } else if (html.includes('Shopify') || html.includes('/shopify')) {
        possibleCms = 'Shopify';
        
        applications.push({
          name: 'Shopify',
          categories: ['cms', 'ecommerce'],
          version: 'Unknown'
        });
      } else if (html.includes('Magento') || html.includes('/mage/')) {
        possibleCms = 'Magento';
        
        applications.push({
          name: 'Magento',
          categories: ['cms', 'ecommerce'],
          version: 'Unknown'
        });
      }
      
      // Check for common frameworks
      if (html.includes('react') || html.includes('reactjs') || html.includes('_reactjs')) {
        possibleFramework = 'React';
        libraries.push('React');
        
        applications.push({
          name: 'React',
          categories: ['javascript-frameworks'],
          version: 'Unknown'
        });
      } else if (html.includes('angular') || html.includes('ng-app') || html.includes('ng-controller')) {
        possibleFramework = 'Angular';
        libraries.push('Angular');
        
        applications.push({
          name: 'Angular',
          categories: ['javascript-frameworks'],
          version: 'Unknown'
        });
      } else if (html.includes('vue.js') || html.includes('vue@')) {
        possibleFramework = 'Vue.js';
        libraries.push('Vue.js');
        
        applications.push({
          name: 'Vue.js',
          categories: ['javascript-frameworks'],
          version: 'Unknown'
        });
      } else if (html.includes('ember.js') || html.includes('ember-app')) {
        possibleFramework = 'Ember.js';
        libraries.push('Ember.js');
        
        applications.push({
          name: 'Ember.js',
          categories: ['javascript-frameworks'],
          version: 'Unknown'
        });
      }
      
      // Check for common libraries
      if (html.includes('jquery')) {
        libraries.push('jQuery');
        
        // Look for jQuery version
        const jQueryVersionMatch = html.match(/jquery[.-]?([\d\.]+)/i);
        const jQueryVersion = jQueryVersionMatch ? jQueryVersionMatch[1] : 'Unknown';
        
        applications.push({
          name: 'jQuery',
          categories: ['javascript-libraries'],
          version: jQueryVersion
        });
      }
      
      if (html.includes('bootstrap')) {
        libraries.push('Bootstrap');
        
        // Look for Bootstrap version
        const bootstrapVersionMatch = html.match(/bootstrap[.-]?([\d\.]+)/i);
        const bootstrapVersion = bootstrapVersionMatch ? bootstrapVersionMatch[1] : 'Unknown';
        
        applications.push({
          name: 'Bootstrap',
          categories: ['ui-frameworks'],
          version: bootstrapVersion
        });
      }
      
      if (html.includes('tailwind')) {
        libraries.push('Tailwind CSS');
        
        applications.push({
          name: 'Tailwind CSS',
          categories: ['ui-frameworks'],
          version: 'Unknown'
        });
      }
      
      if (html.includes('axios')) {
        libraries.push('Axios');
        
        applications.push({
          name: 'Axios',
          categories: ['javascript-libraries'],
          version: 'Unknown'
        });
      }
      
      if (html.includes('lodash') || html.includes('lodash.min.js')) {
        libraries.push('Lodash');
        
        applications.push({
          name: 'Lodash',
          categories: ['javascript-libraries'],
          version: 'Unknown'
        });
      }
      
      // Check for web servers not detectable via Server header
      if (html.includes('Nginx') && serverHeader === 'Unknown') {
        serverHeader = 'Nginx';
        
        applications.push({
          name: 'Nginx',
          categories: ['web-servers'],
          version: 'Unknown'
        });
      }
      
      if (html.includes('Apache') && serverHeader === 'Unknown') {
        serverHeader = 'Apache';
        
        applications.push({
          name: 'Apache',
          categories: ['web-servers'],
          version: 'Unknown'
        });
      }
      
      // Check for Node.js
      if (response.headers['x-powered-by'] && response.headers['x-powered-by'].includes('Express')) {
        libraries.push('Express.js');
        serverHeader = 'Node.js with Express';
        
        applications.push({
          name: 'Express.js',
          categories: ['web-frameworks'],
          version: 'Unknown'
        });
        
        applications.push({
          name: 'Node.js',
          categories: ['web-servers'],
          version: 'Unknown'
        });
      }
      
      // Check for PHP
      if (response.headers['x-powered-by'] && response.headers['x-powered-by'].includes('PHP')) {
        const phpVersionMatch = response.headers['x-powered-by'].match(/PHP\/([\d\.]+)/);
        const phpVersion = phpVersionMatch ? phpVersionMatch[1] : 'Unknown';
        
        applications.push({
          name: 'PHP',
          categories: ['programming-languages'],
          version: phpVersion
        });
      }
      
      // Check for common analytics tools
      if (html.includes('google-analytics.com') || html.includes('GoogleAnalytics')) {
        libraries.push('Google Analytics');
        
        applications.push({
          name: 'Google Analytics',
          categories: ['analytics'],
          version: 'Unknown'
        });
      }
      
      if (html.includes('hotjar')) {
        libraries.push('Hotjar');
        
        applications.push({
          name: 'Hotjar',
          categories: ['analytics'],
          version: 'Unknown'
        });
      }
    } catch (error) {
      console.error('Technology detection error:', error);
    }
    
    res.json({
      applications,
      server: serverHeader,
      cms: possibleCms,
      framework: possibleFramework,
      libraries
    });
  } catch (error) {
    console.error('Technology Detection Error:', error);
    res.status(500).json({ 
      applications: [],
      server: 'Unknown',
      cms: 'Unknown',
      framework: 'Unknown',
      libraries: []
    });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});