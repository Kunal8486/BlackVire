import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network, 
  BarChart2, 
  Shield, 
  Settings, 
  Menu, 
  X 
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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

        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <a 
              key={item.label} 
              href={item.path} 
              className="navbar-item"
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>

        <button 
          className="navbar-toggle" 
          onClick={toggleMenu}
          aria-label="Toggle Navigation"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;