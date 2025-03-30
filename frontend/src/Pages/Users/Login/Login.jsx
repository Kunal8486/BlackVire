import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../../App'; // Update the import path based on your file structure

import './Login.css';

// Configuration
const API_URL = 'http://localhost:5100/api';
const REDIRECT_DELAY = 1000; // ms to wait before redirecting after successful login

// Create axios instance with interceptor for auth token
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000 // 10 second timeout
});

// Request interceptor for auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers['x-auth-token'] = token;
    return config;
  }, 
  error => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: "Network error. Please check your connection and try again."
      });
    }
    
    // Handle API errors
    return Promise.reject(error.response.data);
  }
);

// Auth service
const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const LoginPage = () => {
  // Get auth context
  const { login: handleLogin } = useContext(AuthContext);
  
  // Navigation and location
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  // Step handling
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  // UI states
  const [isCurrentFieldFocused, setIsCurrentFieldFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Error handling
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    email: null,
    password: null
  });
  
  // Input refs for auto-focus
  const inputRefs = {
    1: useRef(null),
    2: useRef(null)
  };
  
  // Particles animation
  const canvasRef = useRef(null);
  
  // Check for stored credentials on initial load
  useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberMe");
    if (savedCredentials) {
      try {
        const { email } = JSON.parse(savedCredentials);
        setFormData(prev => ({
          ...prev,
          email,
          rememberMe: true
        }));
      } catch (err) {
        console.error("Failed to parse saved credentials", err);
        localStorage.removeItem("rememberMe");
      }
    }
    
    // Check for success message from registration
    const successMsg = localStorage.getItem("registrationSuccess");
    if (successMsg) {
      setError({ type: "success", message: successMsg });
      localStorage.removeItem("registrationSuccess");
    }
    
    // Check for message passed via location state
    if (location.state?.message) {
      setError({ type: "success", message: location.state.message });
    }
  }, [location.state]);

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor(window.innerWidth / 10);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          speedX: Math.random() * 1 - 0.5,
          speedY: Math.random() * 1 - 0.5,
          opacity: Math.random() * 0.5 + 0.1
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, index) => {
        // Draw particle
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap around screen edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Connect particles that are close
        particles.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              ctx.strokeStyle = `rgba(0, 230, 150, ${0.1 * (1 - distance/100)})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        });
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Auto-focus on the current input field when step changes
  useEffect(() => {
    if (inputRefs[currentStep] && inputRefs[currentStep].current) {
      inputRefs[currentStep].current.focus();
    }
  }, [currentStep]);
  
  // Handle navigation after successful login
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        // Navigate to dashboard or redirected path
        const from = location.state?.from || "/dashboard";
        navigate(from, { replace: true });
      }, REDIRECT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, navigate, location.state]);

  // Form input change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear field errors on valid input
    validateField(name, newValue);
  };
  
  // Validate individual field
  const validateField = (fieldName, value) => {
    const updatedErrors = { ...fieldErrors };
    
    switch(fieldName) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          updatedErrors.email = "Please enter a valid email address";
        } else {
          updatedErrors.email = null;
        }
        break;
        
      case 'password':
        if (value.length < 6) {
          updatedErrors.password = "Password must be at least 6 characters";
        } else {
          updatedErrors.password = null;
        }
        break;
        
      default:
        break;
    }
    
    setFieldErrors(updatedErrors);
    return !updatedErrors[fieldName]; // Return true if valid
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < totalSteps && validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
      setIsCurrentFieldFocused(false);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setIsCurrentFieldFocused(false);
      setError(null);
    }
  };

  // Validate current step
  const validateCurrentStep = () => {
    let isValid = true;
    
    switch (currentStep) {
      case 1:
        isValid = validateField('email', formData.email);
        break;
      case 2:
        isValid = validateField('password', formData.password);
        break;
      default:
        break;
    }

    return isValid;
  };

  // Check if current step is valid (for button enabling)
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 2:
        return formData.password.length >= 6;
      default:
        return false;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateCurrentStep()) {
      return;
    }
  
    if (currentStep === totalSteps) {
      setIsLoading(true);
      setError(null);
  
      try {
        const response = await login({
          email: formData.email.trim(),
          password: formData.password
        });
  
        // Save to local storage if remember me is checked
        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", JSON.stringify({
            email: formData.email.trim()
          }));
        } else {
          localStorage.removeItem("rememberMe");
        }
  
        // Save token and update auth state
        if (response.token) {
          handleLogin(response.token, response.user); // Call handleLogin from AuthContext
          
        }
  
        setIsLoading(false);
        setLoginSuccess(true);
  
      } catch (err) {
        setIsLoading(false);
        
        // Handle specific error responses
        if (err.errors && Array.isArray(err.errors)) {
          handleValidationErrors(err.errors);
        } else if (err.message) {
          handleErrorMessage(err.message);
        } else {
          setError({ type: "error", message: "An unexpected error occurred. Please try again later." });
        }
      }
    } else {
      nextStep();
    }
  };
  
  // Handle validation errors from API
  const handleValidationErrors = (errors) => {
    const newFieldErrors = { ...fieldErrors };
    let generalError = null;
    let stepToNavigate = null;

    errors.forEach((error) => {
      switch(error.param) {
        case "email":
          newFieldErrors.email = error.msg;
          stepToNavigate = 1;
          break;
        case "password":
          newFieldErrors.password = error.msg;
          stepToNavigate = 2;
          break;
        default:
          generalError = error.msg;
      }
    });

    setFieldErrors(newFieldErrors);
    if (generalError) setError({ type: "error", message: generalError });
    if (stepToNavigate) setCurrentStep(stepToNavigate);
  };
  
  // Handle error messages from API
  const handleErrorMessage = (message) => {
    if (message.toLowerCase().includes("email") || message.toLowerCase().includes("user")) {
      setFieldErrors({ ...fieldErrors, email: message });
      setCurrentStep(1);
    } else if (message.toLowerCase().includes("password")) {
      setFieldErrors({ ...fieldErrors, password: message });
      setCurrentStep(2);
    } else {
      setError({ type: "error", message });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isCurrentStepValid()) {
        if (currentStep < totalSteps) {
          nextStep();
        } else {
          handleSubmit(e);
        }
      }
    }
  };
  
  // Field focus handlers
  const handleFocus = () => setIsCurrentFieldFocused(true);
  
  const handleBlur = () => {
    // Keep 'focused' class if there's text in the current input
    switch (currentStep) {
      case 1:
        setIsCurrentFieldFocused(formData.email.length > 0);
        break;
      case 2:
        setIsCurrentFieldFocused(formData.password.length > 0);
        break;
      default:
        setIsCurrentFieldFocused(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Progress indicator calculation
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  // Step headings and descriptions
  const stepInfo = {
    1: { heading: "Welcome Back", subheading: "Enter your email to get started" },
    2: { heading: "Enter Password", subheading: "Please enter your password to continue" }
  };
  
  // Social login handlers
  const handleSocialLogin = (provider) => {
    // In a real app, this would redirect to OAuth provider
    console.log(`Logging in with ${provider}`);
    setError({ type: "error", message: `${provider} login is not implemented in this demo` });
  };

  return (
    <div className="login-container">
      <canvas ref={canvasRef} className="particles-canvas"></canvas>
      
      <div className="login-card">
        <div className="logo-container">
          <span className="logo-text">BLACKVIRE</span>
          <div className="logo-underline"></div>
        </div>
        
        {/* Progress bar */}
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        
        <h1>{loginSuccess ? "Success!" : stepInfo[currentStep].heading}</h1>
        <p className="subtitle">{loginSuccess ? "You've been logged in successfully" : stepInfo[currentStep].subheading}</p>
        
        {/* Success/Error message display */}
        {error && (
          <div className={`message-box ${error.type === "success" ? "success-message" : "error-message"}`} role="alert">
            {error.type === "success" && <div className="success-icon">✓</div>}
            <div>{error.message}</div>
          </div>
        )}
        
        {/* Success message display */}
        {loginSuccess && (
          <div className="success-message" role="alert">
            <div className="success-icon">✓</div>
            <div>Login successful! Redirecting to dashboard...</div>
          </div>
        )}
        
        {!loginSuccess && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Step 1: Email */}
            {currentStep === 1 && (
              <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.email ? 'error' : ''}`}>
                <input
                  ref={inputRefs[1]}
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "emailError" : undefined}
                  required
                />
                <label htmlFor="email">Email Address</label>
                <span className="input-highlight"></span>
                {fieldErrors.email && (
                  <div className="field-error" id="emailError" role="alert">{fieldErrors.email}</div>
                )}
              </div>
            )}
            
            {/* Step 2: Password */}
            {currentStep === 2 && (
              <>
                <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.password ? 'error' : ''}`}>
                  <div className="password-input-wrapper">
                    <input
                      ref={inputRefs[2]}
                      type={passwordVisible ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      autoComplete="current-password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "passwordError" : undefined}
                      required
                    />
                    <label htmlFor="password">Password</label>
                    <button 
                      type="button" 
                      className="toggle-password" 
                      onClick={togglePasswordVisibility}
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                    >
                      {passwordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="input-highlight"></span>
                  {fieldErrors.password && (
                    <div className="field-error" id="passwordError" role="alert">{fieldErrors.password}</div>
                  )}
                </div>
                
                <div className="options-row">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange} 
                    />
                    <span className="custom-checkbox"></span>
                    Remember me
                  </label>
                  <a href="/forgot-password" className="forgot-link">Forgot Password?</a>
                </div>
              </>
            )}
            
            {/* Navigation buttons */}
            <div className="navigation-buttons">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep}
                  className="back-button"
                  aria-label="Go back to previous step"
                >
                  Back
                </button>
              )}
              
              <button 
                type="submit" 
                className={`login-button ${isLoading ? 'loading' : ''}`}
                disabled={!isCurrentStepValid() || isLoading}
                style={{ flex: currentStep > 1 ? '2' : '1' }}
                aria-label={currentStep === totalSteps ? 'Sign in' : 'Continue to next step'}
              >
                {isLoading ? (
                  <span className="loader" aria-hidden="true"></span>
                ) : (
                  currentStep === totalSteps ? 'Sign In' : 'Continue'
                )}
              </button>
            </div>
          </form>
        )}
        
        {/* Show dashboard link immediately on success */}
        {loginSuccess ? (
          <div className="success-login-link">
            <a href="/dashboard" className="login-link-button">Go to Dashboard</a>
          </div>
        ) : (
          <>
            {/* Social login options */}
            <div className="or-divider">
              <span>or continue with</span>
            </div>
            
            <div className="social-login">
              <button 
                className="social-button" 
                onClick={() => handleSocialLogin('Google')}
                aria-label="Sign in with Google"
              >
                <i className="social-icon google-icon" aria-hidden="true"></i>
              </button>
              <button 
                className="social-button" 
                onClick={() => handleSocialLogin('GitHub')}
                aria-label="Sign in with GitHub"
              >
                <i className="social-icon github-icon" aria-hidden="true"></i>
              </button>
              <button 
                className="social-button" 
                onClick={() => handleSocialLogin('Twitter')}
                aria-label="Sign in with Twitter"
              >
                <i className="social-icon twitter-icon" aria-hidden="true"></i>
              </button>
            </div>
            
            <p className="signup-prompt">
              Don't have an account? <a href="/register">Create account</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;