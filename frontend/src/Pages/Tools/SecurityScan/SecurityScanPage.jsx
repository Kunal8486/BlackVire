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
    const severityColors = {
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      critical: 'bg-red-600/20 text-red-400 border-red-600/50'
    };

    const severityIcons = {
      low: <Info className="w-3 h-3 mr-1.5" />,
      medium: <AlertCircle className="w-3 h-3 mr-1.5" />,
      high: <AlertTriangle className="w-3 h-3 mr-1.5" />,
      critical: <Zap className="w-3 h-3 mr-1.5" />
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${severityColors[severity] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'} transition-colors`}>
        {severityIcons[severity]}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getProgressColor = () => {
    if (scanProgress < 30) return 'from-blue-600 to-blue-500';
    if (scanProgress < 60) return 'from-blue-500 to-blue-400';
    if (scanProgress < 90) return 'from-blue-400 to-blue-300';
    return 'from-green-500 to-green-400';
  };

  const getThreatLevelColor = (level) => {
    const colors = {
      low: 'text-blue-400',
      medium: 'text-yellow-400',
      high: 'text-orange-500',
      critical: 'text-red-500',
      none: 'text-green-400'
    };
    return colors[level?.toLowerCase()] || 'text-gray-400';
  };

  const getThreatLevelBg = (level) => {
    const colors = {
      low: 'bg-blue-500/10',
      medium: 'bg-yellow-500/10',
      high: 'bg-orange-500/10',
      critical: 'bg-red-500/10',
      none: 'bg-green-500/10'
    };
    return colors[level?.toLowerCase()] || 'bg-gray-500/10';
  };

  const ScanTypeCard = ({ type, icon, title, description, timeEstimate, selected, onClick }) => (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${selected ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>~{timeEstimate}</span>
          </div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 p-8 rounded-2xl border border-blue-800/50 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center text-white">
              <ShieldCheck className="mr-3 text-blue-400" size={32} /> Security Scan Dashboard
            </h1>
            <p className="text-gray-300 max-w-2xl">
              Proactively identify vulnerabilities in your systems with comprehensive security scanning.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-sm">
              <Server className="w-4 h-4 mr-2 text-blue-400" />
              Last scan: {scanResult ? new Date(scanResult.timestamp).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-6">
          <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800">
            <button 
              onClick={() => setShowScanOptions(!showScanOptions)}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-2 group"
            >
              {showScanOptions ? (
                <ChevronUp className="mr-2 transition-transform group-hover:-translate-y-0.5" size={18} />
              ) : (
                <ChevronDown className="mr-2 transition-transform group-hover:translate-y-0.5" size={18} />
              )}
              <span className="font-medium">Scan Configuration</span>
            </button>
            
            {showScanOptions && (
              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <Scan className="w-4 h-4 mr-2 text-blue-400" />
                    Scan Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ScanTypeCard
                      type="quick"
                      icon={<Zap className="w-5 h-5" />}
                      title="Quick Scan"
                      description="Basic vulnerability check"
                      timeEstimate="5 minutes"
                      selected={scanType === 'quick'}
                      onClick={() => setScanType('quick')}
                    />
                    <ScanTypeCard
                      type="standard"
                      icon={<ShieldCheck className="w-5 h-5" />}
                      title="Standard Scan"
                      description="Comprehensive security check"
                      timeEstimate="15 minutes"
                      selected={scanType === 'standard'}
                      onClick={() => setScanType('standard')}
                    />
                    <ScanTypeCard
                      type="deep"
                      icon={<Shield className="w-5 h-5" />}
                      title="Deep Scan"
                      description="In-depth penetration testing"
                      timeEstimate="30+ minutes"
                      selected={scanType === 'deep'}
                      onClick={() => setScanType('deep')}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                    <Server className="w-4 h-4 mr-2 text-blue-400" />
                    Scan Target
                  </h3>
                  <div className="flex flex-col space-y-2">
                    <input
                      type="text"
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="127.0.0.1, example.com, or 192.168.1.0/24"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-gray-500 flex items-center">
                      <Info className="w-3 h-3 mr-1" />
                      IP address, hostname, or CIDR notation for network range
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`flex items-center justify-center py-3 px-8 rounded-xl font-medium transition-all ${
                isScanning 
                  ? 'bg-blue-600/50 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg hover:shadow-blue-800/40'
              } text-white group`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <div className="mr-2 group-hover:animate-pulse">
                    <ShieldCheck />
                  </div>
                  Run Security Scan
                </>
              )}
            </button>

            {isScanning && (
              <button
                onClick={handleCancelScan}
                className="flex items-center justify-center py-3 px-6 rounded-xl font-medium transition-all bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white shadow-lg hover:shadow-gray-800/30"
              >
                <XCircle className="mr-2" />
                Cancel Scan
              </button>
            )}
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="mb-8 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Loader2 className="mr-2 animate-spin text-blue-500" /> Scan in Progress
            </h2>
            <div className="flex items-center text-sm text-gray-400">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>Estimated time remaining: {estimatedTime}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="mb-3 flex justify-between items-center">
              <span className="text-sm text-blue-400 font-medium flex items-center">
                <ChevronRight className="w-4 h-4 mr-1" />
                {scanStage}
              </span>
              <span className="text-sm font-bold text-white bg-blue-900/80 px-3 py-1 rounded-full">
                {scanProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out`}
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-gray-400 text-sm flex items-center">
            <Info className="w-4 h-4 mr-2 text-blue-400" />
            <span>You can continue using other features while the scan runs in the background</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 p-6 bg-red-900/20 border border-red-700/50 rounded-2xl shadow-lg animate-fade">
          <div className="flex items-start">
            <div className="p-2 bg-red-500/20 rounded-lg mr-4">
              <XCircle className="text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400 mb-2">Scan Failed</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm transition-colors"
                >
                  Dismiss
                </button>
                <button 
                  onClick={handleScan}
                  className="px-4 py-2 bg-blue-600/70 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                >
                  Retry Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanResult && (
        <div className="mb-8 animate-fade">
          <div className="mb-6 p-6 bg-gray-900 border border-green-700/50 rounded-2xl shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center text-green-400">
                <div className="p-2 bg-green-500/20 rounded-lg mr-4">
                  <Check size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Scan Complete</h2>
                  <p className="text-sm text-gray-400">Completed at: {new Date(scanResult.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                <div className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">
                  <span className="text-gray-400">Target:</span> <span className="font-mono text-gray-300">{targetAddress}</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">
                  <span className="text-gray-400">Scan ID:</span> <span className="font-mono text-gray-300">{scanResult.scanId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-xl border ${getThreatLevelBg(scanResult.threatLevel)} border-gray-700 shadow-md hover:shadow-lg transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Threat Level
                </h3>
                <AlertTriangle className={`${getThreatLevelColor(scanResult.threatLevel)}`} size={18} />
              </div>
              <p className={`text-3xl font-bold ${getThreatLevelColor(scanResult.threatLevel)} capitalize`}>
                {scanResult.threatLevel || 'None'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Overall security risk assessment
              </p>
            </div>
            
            <div className="p-5 bg-gray-900 rounded-xl border border-gray-700 shadow-md hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium flex items-center">
                  <Server className="w-4 h-4 mr-2" />
                  Systems Scanned
                </h3>
                <BarChart2 className="text-blue-400" size={18} />
              </div>
              <p className="text-3xl font-bold text-white">{scanResult.systemsScanned}</p>
              <p className="text-xs text-gray-500 mt-2">
                Number of systems analyzed
              </p>
            </div>
            
            <div className="p-5 bg-gray-900 rounded-xl border border-gray-700 shadow-md hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Issues Found
                </h3>
                <div className={scanResult.totalIssues > 0 ? "text-orange-400" : "text-green-400"}>
                  {scanResult.totalIssues > 0 ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{scanResult.totalIssues}</p>
              <p className="text-xs text-gray-500 mt-2">
                {scanResult.totalIssues === 0 ? 'No vulnerabilities detected' : 'Potential security issues'}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-lg overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold flex items-center">
                <AlertTriangle className="mr-3 text-orange-400" /> 
                Security Findings
              </h2>
            </div>

            {scanResult.findings && scanResult.findings.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {scanResult.findings.map(finding => (
                  <div 
                    key={finding.id} 
                    className="p-6 hover:bg-gray-800/50 transition-colors"
                  >
                    <div 
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleFindingExpansion(finding.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`mt-1 p-2 rounded-lg ${finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 
                                         finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                         finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                         'bg-blue-500/20 text-blue-400'}`}>
                          {finding.severity === 'critical' || finding.severity === 'high' ? (
                            <AlertTriangle size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{finding.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {renderSeverityBadge(finding.severity)}
                            {finding.cvssScore && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-700 text-xs font-medium text-gray-300">
                                CVSS: {finding.cvssScore}
                              </span>
                            )}
                            {finding.cve && (
                              <a 
                                href={`https://nvd.nist.gov/vuln/detail/${finding.cve}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-xs font-medium text-gray-300 transition-colors"
                              >
                                {finding.cve}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {expandedFindings[finding.id] ? (
                          <ChevronUp className="text-gray-400 mt-1.5" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400 mt-1.5" size={20} />
                        )}
                      </div>
                    </div>
                    
                    {expandedFindings[finding.id] && (
                      <div className="mt-6 pt-6 border-t border-gray-800 animate-fadeDown space-y-5">
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                            <Info className="mr-2 text-blue-400" size={16} />
                            Description
                          </h4>
                          <p className="text-gray-300">{finding.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                              <Server className="mr-2 text-blue-400" size={16} />
                              Affected Systems
                            </h4>
                            <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm text-gray-300">
                              {finding.affectedSystems || targetAddress}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                              <Check className="mr-2 text-green-400" size={16} />
                              Recommended Action
                            </h4>
                            <div className="bg-gray-800 p-4 rounded-lg text-gray-300">
                              {finding.remediation}
                            </div>
                          </div>
                        </div>

                        {finding.references && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                              <ExternalLink className="mr-2 text-blue-400" size={16} />
                              References
                            </h4>
                            <div className="space-y-2">
                              {finding.references.map((ref, index) => (
                                <a 
                                  key={index}
                                  href={ref.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block text-blue-400 hover:text-blue-300 text-sm transition-colors flex items-center"
                                >
                                  <ChevronRight className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                  <span className="truncate">{ref.title || ref.url}</span>
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
              <div className="p-12 text-center">
                <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                  <Check className="text-green-400" size={32} />
                </div>
                <h3 className="text-xl font-medium text-green-400 mb-3">No Security Issues Found</h3>
                <p className="text-gray-400 max-w-lg mx-auto">
                  The scan completed successfully and didn't detect any security vulnerabilities in your systems.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center py-2.5 px-6 rounded-xl font-medium transition-colors bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Export Report
            </button>
            <button
              onClick={() => setScanResult(null)}
              className="flex items-center justify-center py-2.5 px-6 rounded-xl font-medium transition-colors bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Scan className="w-4 h-4 mr-2" />
              Run New Scan
            </button>
          </div>
        </div>
      )}

      {!isScanning && !scanResult && !error && (
        <div className="p-12 bg-gray-900 rounded-2xl border border-gray-700 shadow-lg text-center">
          <div className="mx-auto w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="text-blue-400" size={40} />
          </div>
          <h2 className="text-2xl font-medium text-gray-300 mb-4">No Recent Scan Results</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Get started by running a security scan to identify potential vulnerabilities in your systems.
          </p>
          <button
            onClick={handleScan}
            className="mx-auto flex items-center justify-center py-2.5 px-8 rounded-xl font-medium transition-all bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg hover:shadow-blue-800/40"
          >
            <ShieldCheck className="mr-2" />
            Run Initial Scan
          </button>
          <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="inline-flex items-center text-sm text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">
              <HelpCircle className="mr-2" size={16} />
              <span>Regular scanning is recommended for maintaining system security</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityScanPage;