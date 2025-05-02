import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../App';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const menuRef = useRef(null);
  const profileRef = useRef(null);
  
  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = location.pathname;
  
  // Auth context - directly use values from context
  const { isLoggedIn, user, logout } = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch notification count only if authenticated
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:5100/api/notifications/unread-count', {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotificationCount(data.count);
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    if (isLoggedIn) {
      fetchNotificationCount();
      const intervalId = setInterval(fetchNotificationCount, 60000);
      return () => clearInterval(intervalId);
    } else {
      setNotificationCount(0);
    }
  }, [isLoggedIn]);

  // Close menu when clicking outside
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleNavClick = (path, e) => {
    e.preventDefault();
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      setIsProfileOpen(false);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  const navItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: <Network size={20} />,
      label: 'Domain Scan',
      path: '/security-scanner'
    },
    {
      icon: <BarChart2 size={20} />,
      label: 'Stress Test',
      path: '/stress-test'
    },
  ];

  // Get user information, with fallbacks if properties are not available
  const displayName = user?.fullName || "Guest";
  const userRole = user?.role || "User";
  
  // Get profile picture from user data structure matching the backend API format
  // The backend returns the full URL already formatted
  const userAvatar = user?.profilePicture || null;
  
  // Default avatar if none is provided
  // const defaultAvatar = "http://localhost:5100/uploads/default-profile-pic.jpg";

  // Check if user should be considered logged in (from auth context)
  const hasToken = Boolean(localStorage.getItem('token'));
  const effectivelyLoggedIn = isLoggedIn || (hasToken && user);

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
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
        </div>

        {effectivelyLoggedIn ? (
          // Show full navigation menu when user is authenticated
          <>
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
              <button 
                className="navbar-action-btn" 
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </button>
              
              <div ref={profileRef} className="navbar-profile">
                <button 
                  className="navbar-profile-btn" 
                  onClick={toggleProfile}
                  aria-label="User Profile"
                >
                  {/* {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={displayName} 
                      className="profile-avatar-small" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultAvatar;
                      }}
                    />
                  ) : (
                    <User size={20} />
                  )} */}
                </button>
                
                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-header">
                      {/* <img 
                        src={userAvatar || defaultAvatar} 
                        alt={displayName} 
                        className="profile-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultAvatar;
                        }}
                      /> */}
                      <div className="profile-info">
                        <h4>{displayName}</h4>
                        <p>{userRole}</p>
                      </div>
                    </div>
                    <div className="profile-menu">
                      <a href="/profile" className="profile-item" onClick={(e) => handleNavClick('/profile', e)}>
                        <User size={16} />
                        <span>My Profile</span>
                      </a>
                      <a href="/settings" className="profile-item" onClick={(e) => handleNavClick('/settings', e)}>
                        <Settings size={16} />
                        <span>Account Settings</span>
                      </a>
                      <a href="/logout" className="profile-item logout" onClick={handleLogout}>
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
          </>
        ) : (
          // Show only login button when user is not authenticated
          <div className="navbar-actions">
            <button 
              className="login-btn" 
              onClick={handleLogin}
              aria-label="Login"
            >
              <LogIn size={20} />
              <span>Login</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;