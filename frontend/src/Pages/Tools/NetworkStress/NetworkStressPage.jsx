// frontend/src/pages/NetworkStressPage.jsx
import React, { useState } from 'react';
import './NetworkStressPage.css';

const NetworkStressPage = () => {
  // State management
  const [formData, setFormData] = useState({
    targetIP: '',
    duration: 10
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRawData, setShowRawData] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Form validation
  const validateForm = () => {
    // IP address regex pattern
    const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!formData.targetIP.trim()) {
      setError('Target IP address is required.');
      return false;
    }
    
    if (!ipPattern.test(formData.targetIP)) {
      setError('Please enter a valid IP address (e.g., 192.168.1.1).');
      return false;
    }
    
    const durationNum = parseInt(formData.duration, 10);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 60) {
      setError('Duration must be between 1 and 60 seconds.');
      return false;
    }
    
    setError('');
    return true;
  };

  // Run stress test
  const handleStressTest = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    setLoading(true);
    setResults(null);
    setError('');
  
    try {
      const res = await fetch('http://localhost:5100/api/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
  
      // Ensure valid JSON only when content is non-empty
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        throw new Error('Invalid response from server.');
      }
  
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unexpected server error');
      }
  
      setResults(data);
    } catch (err) {
      setError(err.message || 'Network error occurred while running the stress test.');
      console.error('Stress test error:', err);
    } finally {
      setLoading(false);
    }
  };  

  // Format numbers for display
  const formatNumber = (num) => {
    return num ? parseFloat(num).toFixed(2) : '0';
  };

  return (
    <div className="stress-test-container">
      <header className="stress-test-header">
        <h1>Network Stress Test</h1>
        <p>Test network performance using iperf3</p>
      </header>

      <div className="stress-test-content">
        <form className="stress-test-form" onSubmit={handleStressTest}>
          <div className="form-group">
            <label htmlFor="targetIP">Target IP Address:</label>
            <input
              type="text"
              id="targetIP"
              name="targetIP"
              placeholder="e.g., 192.168.1.1"
              value={formData.targetIP}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="duration">Duration (seconds):</label>
            <input
              type="number"
              id="duration"
              name="duration"
              min="1"
              max="60"
              value={formData.duration}
              onChange={handleInputChange}
            />
            <span className="input-hint">Range: 1-60 seconds</span>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className={`submit-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Running Test...' : 'Run Stress Test'}
          </button>
        </form>

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Running stress test, please wait...</p>
            <p className="loading-subtext">This may take up to {formData.duration} seconds</p>
          </div>
        )}

        {results && (
          <div className="results-container">
            <h2>Test Results</h2>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-title">Send Speed</span>
                <span className="metric-value">{formatNumber(results.summary.sentMbps)} Mbps</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-title">Receive Speed</span>
                <span className="metric-value">{formatNumber(results.summary.receivedMbps)} Mbps</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-title">Duration</span>
                <span className="metric-value">{formatNumber(results.summary.duration)} sec</span>
              </div>
              
              <div className="metric-card">
                <span className="metric-title">Retransmits</span>
                <span className="metric-value">{results.summary.retransmits || 0}</span>
              </div>
            </div>
            
            <div className="raw-data-section">
              <button 
                className="toggle-raw-button" 
                onClick={() => setShowRawData(!showRawData)}
              >
                {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
              </button>
              
              {showRawData && (
                <pre className="raw-output">
                  {JSON.stringify(results.rawOutput, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStressPage;