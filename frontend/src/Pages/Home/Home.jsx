import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Activity, Shield, Radar, BarChart2, Server, Zap, ArrowRight, CheckCircle, Play, Users, Star } from 'lucide-react';
import './Home.css';

const Home = () => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Intersection observer with refs for scroll animations
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const testimonialRef = useRef(null);
  const ctaRef = useRef(null);
  
  const featuresInView = useInView(featuresRef, { once: false, threshold: 0.2 });
  const statsInView = useInView(statsRef, { once: false, threshold: 0.2 });
  const testimonialInView = useInView(testimonialRef, { once: false, threshold: 0.2 });
  const ctaInView = useInView(ctaRef, { once: false, threshold: 0.2 });

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

  const testimonials = [
    {
      name: "Sarah Johnson",
      title: "CTO, TechCorp Inc.",
      quote: "BlackVire has transformed our network security posture. We've seen a 75% reduction in security incidents since implementation.",
      avatar: "/api/placeholder/64/64"
    },
    {
      name: "David Martinez",
      title: "Network Administrator, Global Finance",
      quote: "The dashboard visualizations and real-time alerts have made my job significantly easier. I can identify and resolve issues before they impact users.",
      avatar: "/api/placeholder/64/64"
    },
    {
      name: "Michelle Wong",
      title: "CISO, Healthcare Systems",
      quote: "In a regulated industry like healthcare, BlackVire's comprehensive security features have been instrumental in maintaining compliance while protecting sensitive data.",
      avatar: "/api/placeholder/64/64"
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(current => (current + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

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
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="hero-section"
      >
        <div className="hero-overlay">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero-content"
          >
            <motion.h1 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ type: 'spring', stiffness: 100 }}
              className="le"
            >
              BlackVire
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="subtitle"
            >
              Advanced Network Monitoring & Security Platform
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="hero-description"
            >
              Protect your infrastructure with enterprise-grade security and monitoring tools
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="hero-cta-group"
            >
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }} 
                whileTap={{ scale: 0.95 }} 
                className="cta-button"
              >
                Get Started <ArrowRight size={20} style={{ marginLeft: '10px' }} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
                whileTap={{ scale: 0.95 }} 
                className="cta-secondary-button"
              >
                <Play size={18} style={{ marginRight: '8px' }} /> Watch Demo
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
        
        <div className="hero-particles">
          {Array(20).fill().map((_, i) => (
            <motion.div 
              key={i}
              className="particle"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                opacity: Math.random() * 0.5 + 0.3
              }}
              animate={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight 
              }}
              transition={{ 
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                width: Math.random() * 5 + 2 + 'px',
                height: Math.random() * 5 + 2 + 'px',
                backgroundColor: i % 3 === 0 ? 'var(--accent-blue)' : 
                                i % 3 === 1 ? 'var(--accent-green)' : 'var(--accent-purple)'
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div 
        ref={featuresRef}
        variants={containerVariants}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        className="features-section"
      >
        <motion.h2 
          variants={itemVariants}
          className="section-title"
        >
          Platform Features
        </motion.h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`feature-card ${activeFeature === index ? 'feature-active' : ''}`}
              whileHover={{ scale: 1.03, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
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
                    transition={{ duration: 0.3 }}
                    className="feature-details"
                  >
                    <p>{feature.details}</p>
                    <div className="feature-benefits">
                      {feature.benefits.map((benefit, idx) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="benefit-item"
                        >
                          <CheckCircle size={16} className="benefit-icon" />
                          <span>{benefit}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        ref={statsRef}
        variants={containerVariants}
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
        className="stats-section"
      >
        <div className="stats-container">
          {[
            { value: '99.9%', label: 'Threat Detection', className: 'stat-green', icon: <Shield size={30} /> },
            { value: '24/7', label: 'Continuous Monitoring', className: 'stat-blue', icon: <Activity size={30} /> },
            { value: '500+', label: 'Active Enterprise Users', className: 'stat-purple', icon: <Users size={30} /> }
          ].map((stat, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className={`stat-item ${stat.className}`}
            >
              <div className="stat-icon">{stat.icon}</div>
              <h2>{stat.value}</h2>
              <p>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        ref={testimonialRef}
        variants={containerVariants}
        initial="hidden"
        animate={testimonialInView ? "visible" : "hidden"}
        className="testimonials-section"
      >
        <motion.h2 
          variants={itemVariants}
          className="section-title"
        >
          What Our Clients Say
        </motion.h2>
        
        <div className="testimonial-container">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentTestimonial}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="testimonial-card"
            >
              <div className="testimonial-rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#eab308" color="#eab308" />
                ))}
              </div>
              <p className="testimonial-quote">"{testimonials[currentTestimonial].quote}"</p>
              <div className="testimonial-author">
                <img src={testimonials[currentTestimonial].avatar} alt="avatar" className="testimonial-avatar" />
                <div>
                  <h4>{testimonials[currentTestimonial].name}</h4>
                  <p>{testimonials[currentTestimonial].title}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="testimonial-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div 
        ref={ctaRef}
        variants={containerVariants}
        initial="hidden"
        animate={ctaInView ? "visible" : "hidden"}
        className="cta-section"
      >
        <motion.div variants={itemVariants}>
          <h2>Ready to Secure Your Network?</h2>
          <p className="cta-description">Join hundreds of enterprises that trust BlackVire for their network security</p>
          <div className="cta-buttons">
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} 
              whileTap={{ scale: 0.95 }} 
              className="cta-secondary-button"
            >
              Start Free Trial
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }} 
              whileTap={{ scale: 0.95 }} 
              className="cta-button"
            >
              Contact Sales
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;