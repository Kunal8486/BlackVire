// Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Network,
  BarChart2,
  Shield,
  Settings,
  Menu,
  X,
  Bell,
  User,
  LogOut
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState('/');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const profileRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // Close menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Set isScrolled to true if user has scrolled down more than 50 pixels
      setIsScrolled(window.scrollY > 50);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check in case the page is already scrolled when loaded
    handleScroll();
    
    // Cleanup the event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update active item based on current path
  useEffect(() => {
    const path = window.location.pathname;
    setActiveItem(path);
  }, []);

  const handleNavClick = (path, e) => {
    e.preventDefault();
    setActiveItem(path);
    setIsMenuOpen(false);
    // You can add navigation logic here
    // history.push(path) or window.location.href = path
  };

  const navItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      path: '/'
    },
    {
      icon: <Network size={20} />,
      label: 'Network',
      path: '/network'
    },
    {
      icon: <BarChart2 size={20} />,
      label: 'Performance',
      path: '/performance'
    },
    {
      icon: <Shield size={20} />,
      label: 'Security',
      path: '/security'
    },
    {
      icon: <Settings size={20} />,
      label: 'Settings',
      path: '/settings'
    }
  ];

  return (
    <nav
      className={`blackvire-navbar ${isScrolled ? 'scrolled' : 'transparent'} 
        ${isMenuOpen ? 'menu-open' : ''}`}
    >
      <div className="navbar-wrapper">
        <div className="navbar-brand">
          <img
            src="/img/BlackVireLogo.png"
            alt="BlackVire Logo"
            className="navbar-logo"
          />
        </div>

        <div ref={menuRef} className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.path}
              className={`navbar-item ${activeItem === item.path ? 'active' : ''}`}
              onClick={(e) => handleNavClick(item.path, e)}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeItem === item.path && <div className="active-indicator"></div>}
            </a>
          ))}
        </div>
        
        <div className="navbar-actions">
          <button className="navbar-action-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
          
          <div ref={profileRef} className="navbar-profile">
            <button 
              className="navbar-profile-btn" 
              onClick={toggleProfile}
              aria-label="User Profile"
            >
              <User size={20} />
            </button>
            
            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <img src="/api/placeholder/40/40" alt="User" className="profile-avatar" />
                  <div className="profile-info">
                    <h4>John Doe</h4>
                    <p>Administrator</p>
                  </div>
                </div>
                <div className="profile-menu">
                  <a href="/profile" className="profile-item">
                    <User size={16} />
                    <span>My Profile</span>
                  </a>
                  <a href="/settings" className="profile-item">
                    <Settings size={16} />
                    <span>Account Settings</span>
                  </a>
                  <a href="/logout" className="profile-item logout">
                    <LogOut size={16} />
                    <span>Logout</span>
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <button
            className="navbar-toggle"
            onClick={toggleMenu}
            aria-label="Toggle Navigation"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;