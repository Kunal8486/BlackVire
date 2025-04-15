// src/pages/SecurityScanPage.jsx
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Check, XCircle } from 'lucide-react';

const SecurityScanPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanId, setScanId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

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
        body: JSON.stringify({ scanType: 'quick', targets: '127.0.0.1' }),
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
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-600'
    };

    return (
      <span className={`inline-block px-2 py-1 text-xs font-bold rounded text-white ${severityColors[severity] || 'bg-gray-500'}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center">
        <ShieldCheck className="mr-2" /> Security Scan
      </h1>

      <p className="text-gray-400 mb-8">
        Press the button below to initiate a security scan across your systems.
      </p>

      <div className="flex mb-8 space-x-4">
        <button
          onClick={handleScan}
          disabled={isScanning}
          className={`flex items-center justify-center py-2 px-4 rounded font-medium transition-colors ${
            isScanning 
              ? 'bg-blue-600 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2" />
              Run Scan
            </>
          )}
        </button>

        {isScanning && (
          <button
            onClick={handleCancelScan}
            className="flex items-center justify-center py-2 px-4 rounded font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
          >
            <XCircle className="mr-2" />
            Cancel
          </button>
        )}
      </div>

      {isScanning && (
        <div className="mb-8">
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-gray-400">{scanStage}</span>
            <span className="text-sm text-gray-400">{scanProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 border border-red-600 rounded">
          <div className="flex items-center text-red-500 mb-2">
            <XCircle className="mr-2" />
            <span className="font-medium">Scan Failed</span>
          </div>
          <p className="text-gray-400">{error}</p>
        </div>
      )}

      {scanResult && (
        <div className="mb-8">
          <div className="mb-4 p-4 bg-green-900/30 border border-green-600 rounded">
            <div className="flex items-center text-green-500 mb-2">
              <Check className="mr-2" />
              <span className="font-medium">Scan Complete</span>
            </div>
            <p className="text-gray-400">
              Scan ID: {scanResult.scanId} | Completed at: {new Date(scanResult.timestamp).toLocaleString()}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-gray-400 text-sm mb-1">Threat Level</h3>
              <p className="text-xl font-bold capitalize">{scanResult.threatLevel}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-gray-400 text-sm mb-1">Systems Scanned</h3>
              <p className="text-xl font-bold">{scanResult.systemsScanned}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-gray-400 text-sm mb-1">Issues Found</h3>
              <p className="text-xl font-bold">{scanResult.totalIssues}</p>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Findings</h2>

          {scanResult.findings && scanResult.findings.length > 0 ? (
            <div className="space-y-4">
              {scanResult.findings.map(finding => (
                <div key={finding.id} className="p-4 bg-gray-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{finding.title}</h3>
                    {renderSeverityBadge(finding.severity)}
                  </div>
                  <p className="text-gray-400 mb-3">{finding.description}</p>
                  <div className="bg-gray-700 p-3 rounded">
                    <span className="block text-sm text-gray-400 mb-1">Recommended Action:</span>
                    <span>{finding.remediation}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-800 rounded">
              <p className="text-gray-400">No security issues were found during this scan.</p>
            </div>
          )}
        </div>
      )}

      {!isScanning && !scanResult && !error && (
        <div className="p-8 bg-gray-800 rounded text-center">
          <p className="text-gray-400">No scan results yet. Click "Run Scan" to begin.</p>
        </div>
      )}
    </div>
  );
};

export default SecurityScanPage;