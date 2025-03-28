import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Radar, BarChart2, Server, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import './Home.css';

const Home = () => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollTop / docHeight * 100;
      setScrollProgress(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { 
      icon: <BarChart2 size={40} className="icon-blue" />, 
      title: 'Dashboard & Visualization', 
      description: 'Real-time network monitoring with interactive charts and live traffic analysis.', 
      details: 'Comprehensive insights with dynamic, customizable visualizations for your network.',
      benefits: [
        'Real-time data tracking',
        'Customizable dashboard',
        'Interactive data visualization'
      ]
    },
    { 
      icon: <Radar size={40} className="icon-green" />, 
      title: 'Packet Analysis & Filtering', 
      description: 'Advanced packet inspection with powerful filtering capabilities.', 
      details: 'Deep packet inspection tools allow granular analysis of traffic patterns.',
      benefits: [
        'Comprehensive packet insights',
        'Advanced filtering',
        'Detailed traffic analysis'
      ]
    },
    { 
      icon: <Shield size={40} className="icon-red" />, 
      title: 'Security & Anomaly Detection', 
      description: 'AI-powered threat detection and real-time security alerts.', 
      details: 'Machine learning continuously analyzes network behavior to identify threats.',
      benefits: [
        'AI-driven threat detection',
        'Real-time security monitoring',
        'Proactive threat prevention'
      ]
    },
    { 
      icon: <Zap size={40} className="icon-yellow" />, 
      title: 'Real-time Alerts', 
      description: 'Instant notifications for suspicious activities and network events.', 
      details: 'Receive immediate alerts via email, SMS, and in-app notifications.',
      benefits: [
        'Multi-channel notifications',
        'Instant event tracking',
        'Customizable alert settings'
      ]
    },
    { 
      icon: <Server size={40} className="icon-purple" />, 
      title: 'Admin Controls', 
      description: 'Comprehensive user management and role-based access control.', 
      details: 'Granular permissions ensure secure network management.',
      benefits: [
        'Role-based access',
        'User management',
        'Secure permission controls'
      ]
    },
    { 
      icon: <Activity size={40} className="icon-indigo" />, 
      title: 'Network Utilities', 
      description: 'Built-in tools for diagnostics and system monitoring.', 
      details: 'A suite of tools to troubleshoot, optimize, and maintain your network.',
      benefits: [
        'Diagnostic tools',
        'System performance tracking',
        'Network optimization'
      ]
    }
  ];

  return (
    <div className="home-container">
      {/* Scroll Progress Bar */}
      <div 
        className="scroll-progress" 
        style={{ 
          width: `${scrollProgress}%`, 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          height: '4px', 
          backgroundColor: 'var(--accent-blue)', 
          zIndex: 1000 
        }} 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="hero-section"
      >
        <motion.h1 
          initial={{ scale: 0.9 }} 
          animate={{ scale: 1 }} 
          transition={{ type: 'spring', stiffness: 100 }}
        >
          BlackVire
        </motion.h1>
        <p className="subtitle">Advanced Network Monitoring & Security Platform</p>
        <div className="hero-cta-group">
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="cta-button"
          >
            Get Started <ArrowRight size={20} style={{ marginLeft: '10px' }} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="cta-secondary-button"
          >
            Watch Demo
          </motion.button>
        </div>
      </motion.div>

      <div className="features-section">
        <h2 className="section-title">Platform Features</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`feature-card ${activeFeature === index ? 'feature-active' : ''}`}
              whileHover={{ scale: 1.05 }}
              onClick={() => setActiveFeature(activeFeature === index ? null : index)}
            >
              <div className="feature-header">
                {feature.icon}
                <h3>{feature.title}</h3>
              </div>
              <p className="feature-description">{feature.description}</p>
              <AnimatePresence>
                {activeFeature === index && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="feature-details"
                  >
                    <p>{feature.details}</p>
                    <div className="feature-benefits">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="benefit-item">
                          <CheckCircle size={16} className="benefit-icon" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-container">
          {[
            { value: '99.9%', label: 'Threat Detection', className: 'stat-green' },
            { value: '24/7', label: 'Continuous Monitoring', className: 'stat-blue' },
            { value: '500+', label: 'Active Enterprise Users', className: 'stat-purple' }
          ].map((stat, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.2 }} 
              className={`stat-item ${stat.className}`}
            >
              <h2>{stat.value}</h2>
              <p>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }}
        >
          <h2>Ready to Secure Your Network?</h2>
          <div className="cta-buttons">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="cta-secondary-button"
            >
              Start Free Trial
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="cta-button"
            >
              Contact Sales
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;