import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, AlertTriangle, Check, XCircle, 
  ChevronDown, ChevronUp, BarChart2, AlertCircle, 
  HelpCircle, Info, Server, Clock, Scan, Shield, 
  Zap, ChevronRight, ExternalLink
} from 'lucide-react';
import './SecurityScanPage.css';

const SecurityScanPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanId, setScanId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [expandedFindings, setExpandedFindings] = useState({});
  const [scanType, setScanType] = useState('quick');
  const [targetAddress, setTargetAddress] = useState('127.0.0.1');
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('5 minutes');

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  useEffect(() => {
    // Update estimated time based on scan type
    switch(scanType) {
      case 'quick':
        setEstimatedTime('5 minutes');
        break;
      case 'standard':
        setEstimatedTime('15 minutes');
        break;
      case 'deep':
        setEstimatedTime('30+ minutes');
        break;
      default:
        setEstimatedTime('5 minutes');
    }
  }, [scanType]);

  const toggleFindingExpansion = (id) => {
    setExpandedFindings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
    setScanProgress(0);
    setScanStage('Initializing scan');

    try {
      const res = await fetch('http://localhost:5100/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanType, targets: targetAddress }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to start scan: ${errorText}`);
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        const text = await res.text();
        throw new Error(`Invalid JSON response: ${text}`);
      }

      const { id } = data;
      setScanId(id);

      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`http://localhost:5100/api/scan/status/${id}`);

          if (!statusResponse.ok) {
            throw new Error('Failed to get scan status');
          }

          const statusData = await statusResponse.json();
          const { status, progress, currentStage } = statusData;

          setScanProgress(progress);
          setScanStage(currentStage);

          if (status === 'completed') {
            clearInterval(interval);
            setPollingInterval(null);

            const resultsResponse = await fetch(`http://localhost:5100/api/scan/results/${id}`);

            if (!resultsResponse.ok) {
              throw new Error('Failed to fetch scan results');
            }

            const resultsData = await resultsResponse.json();
            setScanResult(resultsData);
            setIsScanning(false);
          } else if (status === 'failed') {
            clearInterval(interval);
            setPollingInterval(null);
            throw new Error(statusData.error || 'Scan failed');
          }
        } catch (err) {
          clearInterval(interval);
          setPollingInterval(null);
          setError(err.message || 'Error checking scan status');
          setIsScanning(false);
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (err) {
      setError(err.message || 'Failed to start scan');
      setIsScanning(false);
    }
  };

  const handleCancelScan = async () => {
    if (!scanId) return;

    try {
      const response = await fetch(`http://localhost:5100/api/scan/cancel/${scanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel scan');
      }

      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      setIsScanning(false);
      setError('Scan was cancelled');
    } catch (err) {
      setError(err.message || 'Failed to cancel scan');
    }
  };

  const renderSeverityBadge = (severity) => {
    const severityClasses = {
      low: 'severity-badge severity-low',
      medium: 'severity-badge severity-medium',
      high: 'severity-badge severity-high',
      critical: 'severity-badge severity-critical'
    };

    const severityIcons = {
      low: <Info className="badge-icon" />,
      medium: <AlertCircle className="badge-icon" />,
      high: <AlertTriangle className="badge-icon" />,
      critical: <Zap className="badge-icon" />
    };

    return (
      <span className={`${severityClasses[severity] || 'severity-badge severity-default'}`}>
        {severityIcons[severity]}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getProgressColor = () => {
    if (scanProgress < 30) return 'progress-blue-high';
    if (scanProgress < 60) return 'progress-blue-medium';
    if (scanProgress < 90) return 'progress-blue-low';
    return 'progress-green';
  };

  const getThreatLevelColor = (level) => {
    const colors = {
      low: 'text-blue',
      medium: 'text-yellow',
      high: 'text-orange',
      critical: 'text-red',
      none: 'text-green'
    };
    return colors[level?.toLowerCase()] || 'text-gray';
  };

  const getThreatLevelBg = (level) => {
    const colors = {
      low: 'bg-blue-light',
      medium: 'bg-yellow-light',
      high: 'bg-orange-light',
      critical: 'bg-red-light',
      none: 'bg-green-light'
    };
    return colors[level?.toLowerCase()] || 'bg-gray-light';
  };

  const ScanTypeCard = ({ type, icon, title, description, timeEstimate, selected, onClick }) => (
    <div 
      onClick={onClick}
      className={`scan-type-card ${selected ? 'scan-type-selected' : 'scan-type-default'}`}
    >
      <div className="scan-type-content">
        <div className={`scan-type-icon ${selected ? 'scan-type-icon-selected' : 'scan-type-icon-default'}`}>
          {icon}
        </div>
        <div className="scan-type-details">
          <h3 className="scan-type-title">{title}</h3>
          <p className="scan-type-description">{description}</p>
          <div className="scan-type-time">
            <Clock className="time-icon" />
            <span>~{timeEstimate}</span>
          </div>
        </div>
        {selected && (
          <div className="scan-type-check">
            <Check className="check-icon" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header-panel">
        <div className="header-content">
          <div>
            <h1 className="page-title">
              <ShieldCheck className="title-icon" /> Security Scan Dashboard
            </h1>
            <p className="page-description">
              Proactively identify vulnerabilities in your systems with comprehensive security scanning.
            </p>
          </div>
          <div>
            <div className="last-scan-badge">
              <Server className="badge-icon" />
              Last scan: {scanResult ? new Date(scanResult.timestamp).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="configuration-panel">
          <div className="config-container">
            <button 
              onClick={() => setShowScanOptions(!showScanOptions)}
              className="config-toggle"
            >
              {showScanOptions ? (
                <ChevronUp className="toggle-icon" />
              ) : (
                <ChevronDown className="toggle-icon" />
              )}
              <span className="toggle-text">Scan Configuration</span>
            </button>
            
            {showScanOptions && (
              <div className="config-options">
                <div className="option-section">
                  <h3 className="option-title">
                    <Scan className="option-icon" />
                    Scan Type
                  </h3>
                  <div className="scan-types-grid">
                    <ScanTypeCard
                      type="quick"
                      icon={<Zap />}
                      title="Quick Scan"
                      description="Basic vulnerability check"
                      timeEstimate="5 minutes"
                      selected={scanType === 'quick'}
                      onClick={() => setScanType('quick')}
                    />
                    <ScanTypeCard
                      type="standard"
                      icon={<ShieldCheck />}
                      title="Standard Scan"
                      description="Comprehensive security check"
                      timeEstimate="15 minutes"
                      selected={scanType === 'standard'}
                      onClick={() => setScanType('standard')}
                    />
                    <ScanTypeCard
                      type="deep"
                      icon={<Shield />}
                      title="Deep Scan"
                      description="In-depth penetration testing"
                      timeEstimate="30+ minutes"
                      selected={scanType === 'deep'}
                      onClick={() => setScanType('deep')}
                    />
                  </div>
                </div>
                
                <div className="option-section">
                  <h3 className="option-title">
                    <Server className="option-icon" />
                    Scan Target
                  </h3>
                  <div className="target-input-container">
                    <input
                      type="text"
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="127.0.0.1, example.com, or 192.168.1.0/24"
                      className="target-input"
                    />
                    <p className="input-help">
                      <Info className="help-icon" />
                      IP address, hostname, or CIDR notation for network range
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`scan-button ${isScanning ? 'scan-button-disabled' : 'scan-button-active'}`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="button-icon spinner" />
                  Scanning...
                </>
              ) : (
                <>
                  <div className="button-icon-container">
                    <ShieldCheck />
                  </div>
                  Run Security Scan
                </>
              )}
            </button>

            {isScanning && (
              <button
                onClick={handleCancelScan}
                className="cancel-button"
              >
                <XCircle className="button-icon" />
                Cancel Scan
              </button>
            )}
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="progress-panel">
          <div className="progress-header">
            <h2 className="progress-title">
              <Loader2 className="spinner" /> Scan in Progress
            </h2>
            <div className="estimated-time">
              <Clock className="time-icon" />
              <span>Estimated time remaining: {estimatedTime}</span>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-status">
              <span className="progress-stage">
                <ChevronRight className="stage-icon" />
                {scanStage}
              </span>
              <span className="progress-percentage">
                {scanProgress}%
              </span>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar ${getProgressColor()}`}
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="progress-info">
            <Info className="info-icon" />
            <span>You can continue using other features while the scan runs in the background</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-panel">
          <div className="error-content">
            <div className="error-icon-container">
              <XCircle className="error-icon" />
            </div>
            <div className="error-message-container">
              <h3 className="error-title">Scan Failed</h3>
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button 
                  onClick={() => setError(null)}
                  className="dismiss-button"
                >
                  Dismiss
                </button>
                <button 
                  onClick={handleScan}
                  className="retry-button"
                >
                  Retry Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanResult && (
        <div className="results-container">
          <div className="results-header">
            <div className="results-header-content">
              <div className="completion-status">
                <div className="completion-icon-container">
                  <Check />
                </div>
                <div>
                  <h2 className="completion-title">Scan Complete</h2>
                  <p className="completion-time">Completed at: {new Date(scanResult.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="scan-details">
                <div className="scan-detail-item">
                  <span className="detail-label">Target:</span> <span className="detail-value">{targetAddress}</span>
                </div>
                <div className="scan-detail-item">
                  <span className="detail-label">Scan ID:</span> <span className="detail-value">{scanResult.scanId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="summary-cards">
            <div className={`summary-card ${getThreatLevelBg(scanResult.threatLevel)}`}>
              <div className="card-header">
                <h3 className="card-title">
                  <Shield className="card-icon" />
                  Threat Level
                </h3>
                <AlertTriangle className={getThreatLevelColor(scanResult.threatLevel)} />
              </div>
              <p className={`card-value ${getThreatLevelColor(scanResult.threatLevel)}`}>
                {scanResult.threatLevel || 'None'}
              </p>
              <p className="card-description">
                Overall security risk assessment
              </p>
            </div>
            
            <div className="summary-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Server className="card-icon" />
                  Systems Scanned
                </h3>
                <BarChart2 className="card-header-icon" />
              </div>
              <p className="card-value">
                {scanResult.systemsScanned}
              </p>
              <p className="card-description">
                Number of systems analyzed
              </p>
            </div>
            
            <div className="summary-card">
              <div className="card-header">
                <h3 className="card-title">
                  <AlertTriangle className="card-icon" />
                  Issues Found
                </h3>
                <div className={scanResult.totalIssues > 0 ? "issues-icon issues-found" : "issues-icon issues-none"}>
                  {scanResult.totalIssues > 0 ? (
                    <AlertTriangle />
                  ) : (
                    <Check />
                  )}
                </div>
              </div>
              <p className="card-value">
                {scanResult.totalIssues}
              </p>
              <p className="card-description">
                {scanResult.totalIssues === 0 ? 'No vulnerabilities detected' : 'Potential security issues'}
              </p>
            </div>
          </div>

          <div className="findings-container">
            <div className="findings-header">
              <h2 className="findings-title">
                <AlertTriangle className="findings-title-icon" /> 
                Security Findings
              </h2>
            </div>

            {scanResult.findings && scanResult.findings.length > 0 ? (
              <div className="findings-list">
                {scanResult.findings.map(finding => (
                  <div 
                    key={finding.id} 
                    className="finding-item"
                  >
                    <div 
                      className="finding-header"
                      onClick={() => toggleFindingExpansion(finding.id)}
                    >
                      <div className="finding-title-section">
                        <div className={`finding-icon-container severity-${finding.severity}`}>
                          {finding.severity === 'critical' || finding.severity === 'high' ? (
                            <AlertTriangle />
                          ) : (
                            <AlertCircle />
                          )}
                        </div>
                        <div>
                          <h3 className="finding-title">{finding.title}</h3>
                          <div className="finding-badges">
                            {renderSeverityBadge(finding.severity)}
                            {finding.cvssScore && (
                              <span className="finding-badge">
                                CVSS: {finding.cvssScore}
                              </span>
                            )}
                            {finding.cve && (
                              <a 
                                href={`https://nvd.nist.gov/vuln/detail/${finding.cve}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="finding-badge-link"
                              >
                                {finding.cve}
                                <ExternalLink className="badge-link-icon" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="expand-button">
                        {expandedFindings[finding.id] ? (
                          <ChevronUp className="expand-icon" />
                        ) : (
                          <ChevronDown className="expand-icon" />
                        )}
                      </div>
                    </div>
                    
                    {expandedFindings[finding.id] && (
                      <div className="finding-details">
                        <div className="finding-section">
                          <h4 className="section-title">
                            <Info className="section-icon" />
                            Description
                          </h4>
                          <p className="section-content">{finding.description}</p>
                        </div>
                        
                        <div className="finding-grid">
                          <div className="finding-section">
                            <h4 className="section-title">
                              <Server className="section-icon" />
                              Affected Systems
                            </h4>
                            <div className="code-block">
                              {finding.affectedSystems || targetAddress}
                            </div>
                          </div>
                          
                          <div className="finding-section">
                            <h4 className="section-title">
                              <Check className="section-icon" />
                              Recommended Action
                            </h4>
                            <div className="code-block">
                              {finding.remediation}
                            </div>
                          </div>
                        </div>

                        {finding.references && (
                          <div className="finding-section">
                            <h4 className="section-title">
                              <ExternalLink className="section-icon" />
                              References
                            </h4>
                            <div className="references-list">
                              {finding.references.map((ref, index) => (
                                <a 
                                  key={index}
                                  href={ref.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="reference-link"
                                >
                                  <ChevronRight className="reference-icon" />
                                  <span className="reference-text">{ref.title || ref.url}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-findings">
                <div className="no-findings-icon">
                  <Check className="success-icon" />
                </div>
                <h3 className="no-findings-title">No Security Issues Found</h3>
                <p className="no-findings-description">
                  The scan completed successfully and didn't detect any security vulnerabilities in your systems.
                </p>
              </div>
            )}
          </div>
          
          <div className="results-actions">
            <button
              onClick={() => window.print()}
              className="export-button"
            >
              <ExternalLink className="button-icon" />
              Export Report
            </button>
            <button
              onClick={() => setScanResult(null)}
              className="new-scan-button"
            >
              <Scan className="button-icon" />
              Run New Scan
            </button>
          </div>
        </div>
      )}

      {!isScanning && !scanResult && !error && (
        <div className="empty-state">
          <div className="empty-icon">
            <ShieldCheck className="icon" />
          </div>
          <h2 className="empty-title">No Recent Scan Results</h2>
          <p className="empty-description">
            Get started by running a security scan to identify potential vulnerabilities in your systems.
          </p>
          <button
            onClick={handleScan}
            className="initial-scan-button"
          >
            <ShieldCheck className="button-icon" />
            Run Initial Scan
          </button>
          <div className="empty-footer">
            <div className="recommendation-badge">
              <HelpCircle className="badge-icon" />
              <span>Regular scanning is recommended for maintaining system security</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityScanPage;