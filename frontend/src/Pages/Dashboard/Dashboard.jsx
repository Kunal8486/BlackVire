// pages/Dashboard/Dashboard.jsx
import React from 'react';
import { LineChart, DollarSign, Users, Shield, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate(); // Initialize navigate function

  const handleRunScanClick = () => {
    // Redirect to the security scan page
    navigate('/security-scan'); // Adjust this route to match your app's routing structure
  };

  return (
    <div className="dashboard page-transition">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="header-description">Welcome back! Here's an overview of your security status.</p>
        </div>
        <div className="header-actions">
          <button className="action-button" onClick={handleRunScanClick}>
            <Shield size={16} />
            <span>Run Security Scan</span>
          </button>
          <button className="action-button secondary">
            <Bell size={16} />
            <span>Notifications</span>
          </button>
        </div>
      </header>

      <div className="dashboard-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <Shield />
          </div>
          <div className="stat-content">
            <h3>Security Score</h3>
            <p className="stat-value">94<span className="stat-unit">%</span></p>
            <p className="stat-change positive">↑ 3% from last month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Bell />
          </div>
          <div className="stat-content">
            <h3>Active Alerts</h3>
            <p className="stat-value">7</p>
            <p className="stat-change negative">↑ 2 new alerts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <h3>Protected Users</h3>
            <p className="stat-value">1,284</p>
            <p className="stat-change positive">↑ 24 this month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <h3>Cost Savings</h3>
            <p className="stat-value">42.5<span className="stat-unit">k</span></p>
            <p className="stat-change positive">↑ 12% from last quarter</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <button className="card-action">View All</button>
          </div>
          <div className="activity-list">
            {[ 
              { type: 'alert', message: 'Unusual login attempt detected', time: '10 minutes ago', status: 'critical' },
              { type: 'update', message: 'System updated to version 2.4.0', time: '1 hour ago', status: 'info' },
              { type: 'alert', message: 'Firewall rule updated', time: '3 hours ago', status: 'warning' },
              { type: 'scan', message: 'Security scan completed', time: '5 hours ago', status: 'success' },
              { type: 'update', message: 'User permissions modified', time: '8 hours ago', status: 'info' }
            ].map((activity, index) => (
              <div key={index} className={`activity-item ${activity.status}`}>
                <span className="activity-dot"></span>
                <div className="activity-content">
                  <p className="activity-message">{activity.message}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card threat-card">
          <div className="card-header">
            <h2>Threat Analysis</h2>
            <button className="card-action">Details</button>
          </div>
          <div className="threat-content">
            <div className="threat-chart">
              <div className="chart-placeholder">
                <LineChart size={24} />
                <span>Security Incidents (30 Days)</span>
              </div>
            </div>
            <div className="threat-stats">
              <div className="threat-stat">
                <h4>Blocked Attacks</h4>
                <p>1,432</p>
              </div>
              <div className="threat-stat">
                <h4>Investigation Required</h4>
                <p>3</p>
              </div>
              <div className="threat-stat">
                <h4>Threat Level</h4>
                <p className="threat-level medium">Medium</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card systems-card">
          <div className="card-header">
            <h2>System Health</h2>
            <button className="card-action">Manage</button>
          </div>
          <div className="systems-list">
            {[
              { name: 'Network Firewall', status: 'operational', uptime: '99.9%' },
              { name: 'Database Server', status: 'operational', uptime: '99.7%' },
              { name: 'Web Application', status: 'operational', uptime: '99.8%' },
              { name: 'Authentication Service', status: 'degraded', uptime: '95.2%' },
              { name: 'Storage Cluster', status: 'operational', uptime: '99.9%' }
            ].map((system, index) => (
              <div key={index} className="system-item">
                <div className="system-info">
                  <h4>{system.name}</h4>
                  <div className={`system-status ${system.status}`}>
                    <span className="status-dot"></span>
                    <span className="status-text">{system.status}</span>
                  </div>
                </div>
                <div className="system-uptime">
                  <span>Uptime</span>
                  <p>{system.uptime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card compliance-card">
          <div className="card-header">
            <h2>Compliance Status</h2>
            <button className="card-action">Report</button>
          </div>
          <div className="compliance-content">
            <div className="compliance-overview">
              <div className="compliance-chart">
                <div className="chart-indicator">
                  <div className="chart-progress" style={{ '--progress': '85%' }}></div>
                  <div className="chart-label">85%</div>
                </div>
              </div>
              <div className="compliance-text">
                <h3>Overall Compliance</h3>
                <p>5 items need attention</p>
              </div>
            </div>
            <div className="compliance-frameworks">
              <div className="compliance-framework">
                <h4>GDPR</h4>
                <div className="compliance-bar">
                  <div className="bar-fill" style={{ width: '92%' }}></div>
                  <span>92%</span>
                </div>
              </div>
              <div className="compliance-framework">
                <h4>HIPAA</h4>
                <div className="compliance-bar">
                  <div className="bar-fill" style={{ width: '87%' }}></div>
                  <span>87%</span>
                </div>
              </div>
              <div className="compliance-framework">
                <h4>PCI DSS</h4>
                <div className="compliance-bar">
                  <div className="bar-fill" style={{ width: '79%' }}></div>
                  <span>79%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;