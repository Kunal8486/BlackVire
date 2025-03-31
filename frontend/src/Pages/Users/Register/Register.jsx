import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configuration
const API_URL ='http://localhost:5100/api';
const REDIRECT_DELAY = 2000; // ms to wait before redirecting after successful registration

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

// Updated auth services
const requestEmailVerification = async (email) => {
  try {
    const response = await api.post('/auth/request-verification', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Resend verification email
const resendVerification = async (email) => {
  try {
    const response = await api.post('/auth/request-verification', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const RegistrationPage = () => {
  // Form data state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    verificationCode: ''
  });
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isCurrentFieldFocused, setIsCurrentFieldFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Error handling
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
    fullName: null,
    email: null,
    password: null,
    confirmPassword: null,
    terms: null,
    verificationCode: null
  });

  // Navigation and refs
  const navigate = useNavigate();
  const inputRefs = {
    1: useRef(null),
    2: useRef(null),
    3: useRef(null),
    4: useRef(null),
    5: useRef(null),
  };
  
  // Updated flow: Email -> Verification -> Personal Info -> Password -> Confirmation
  const totalSteps = 5;

  // Auto-focus current input field when step changes
  useEffect(() => {
    if (inputRefs[currentStep]?.current) {
      inputRefs[currentStep].current.focus();
    }
  }, [currentStep]);

  // Handle navigation after successful registration
  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        navigate('/login', { 
          state: { message: "Registration successful! Please log in with your credentials." } 
        });
      }, REDIRECT_DELAY);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
        
      case 'verificationCode':
        if (value.trim().length !== 6) {
          updatedErrors.verificationCode = "Verification code must be 6 characters";
        } else {
          updatedErrors.verificationCode = null;
        }
        break;
        
      case 'fullName':
        if (value.trim().length < 2) {
          updatedErrors.fullName = "Name must be at least 2 characters";
        } else {
          updatedErrors.fullName = null;
        }
        break;
        
      case 'password':
        if (value.length < 6) {
          updatedErrors.password = "Password must be at least 6 characters";
        } else {
          updatedErrors.password = null;
        }
        
        // Also check if confirm password needs to be updated
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          updatedErrors.confirmPassword = "Passwords don't match";
        } else if (formData.confirmPassword) {
          updatedErrors.confirmPassword = null;
        }
        break;
        
      case 'confirmPassword':
        if (value !== formData.password) {
          updatedErrors.confirmPassword = "Passwords don't match";
        } else {
          updatedErrors.confirmPassword = null;
        }
        break;
        
      case 'agreeToTerms':
        if (!value) {
          updatedErrors.terms = "Please agree to the terms and privacy policy";
        } else {
          updatedErrors.terms = null;
        }
        break;
        
      default:
        break;
    }
    
    setFieldErrors(updatedErrors);
    return !updatedErrors[fieldName]; // Return true if valid
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, label: '' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    
    // Character variety checks
    if (/[0-9]/.test(password)) score += 1; // Has numbers
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1; // Has mixed case
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // Has special chars
    
    // Map score to label
    let label = '';
    let color = '';
    
    switch(score) {
      case 0:
      case 1:
        label = 'Weak';
        color = '#e74c3c';
        break;
      case 2:
      case 3:
        label = 'Medium';
        color = '#f39c12';
        break;
      case 4:
      case 5:
        label = 'Strong';
        color = '#2ecc71';
        break;
      default:
        label = '';
        color = '';
    }
    
    return { 
      score, 
      label,
      color,
      percentage: Math.min(100, (score / 5) * 100)
    };
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
      case 1: // Email
        isValid = validateField('email', formData.email);
        break;
      case 2: // Verification Code
        isValid = validateField('verificationCode', formData.verificationCode);
        break;
      case 3: // Name
        isValid = validateField('fullName', formData.fullName);
        break;
      case 4: // Password
        isValid = validateField('password', formData.password);
        break;
      case 5: // Confirm Password & Terms
        isValid = validateField('confirmPassword', formData.confirmPassword) &&
                 validateField('agreeToTerms', formData.agreeToTerms);
        break;
      default:
        break;
    }

    return isValid;
  };

  // Check if current step is valid (for button enabling)
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1: // Email
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 2: // Verification Code
        return formData.verificationCode.trim().length === 6;
      case 3: // Name
        return formData.fullName.trim().length >= 2;
      case 4: // Password
        return formData.password.length >= 6;
      case 5: // Confirm Password & Terms
        return formData.password === formData.confirmPassword && formData.agreeToTerms;
      default:
        return false;
    }
  };

  // Handle verification code request
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    
    if (!validateField('email', formData.email)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await requestEmailVerification(formData.email);
      setIsLoading(false);
      setVerificationSent(true);
      nextStep(); // Move to verification code step
    } catch (err) {
      setIsLoading(false);
      
      if (err.message) {
        setFieldErrors({
          ...fieldErrors,
          email: err.message
        });
      } else {
        setError("Failed to send verification email. Please try again.");
      }
    }
  };
  
  // Handle resend verification email
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await resendVerification(formData.email);
      setIsLoading(false);
      setResendCooldown(60); // 60 second cooldown
      setError("Verification email has been resent. Please check your inbox.");
    } catch (err) {
      setIsLoading(false);
      setError(err.message || "Failed to resend verification email. Please try again.");
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateCurrentStep()) {
      return;
    }
  
    // Handle step-specific behavior
    switch (currentStep) {
      case 1: // Email step
        await handleRequestVerification(e);
        break;
      
      case 2: // Verification step
        // Just validate and move to next step
        if (validateField('verificationCode', formData.verificationCode)) {
          nextStep();
        }
        break;
      
      case 5: // Final step - submit registration
        setIsLoading(true);
        setError(null);
    
        try {
          const response = await register({
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            verificationCode: formData.verificationCode,
            agreeToTerms: String(formData.agreeToTerms)
          });
    
          setIsLoading(false);
          setRegistrationSuccess(true);
          localStorage.setItem("registrationSuccess", response.message || "Registration successful! You can now log in.");
    
        } catch (err) {
          setIsLoading(false);
          
          // Handle specific error responses
          if (err.errors && Array.isArray(err.errors)) {
            handleValidationErrors(err.errors);
          } else if (err.message) {
            handleErrorMessage(err.message);
          } else {
            setError("An unexpected error occurred. Please try again later.");
          }
        }
        break;
      
      default:
        // For other steps, just move to next step
        nextStep();
        break;
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
        case "verificationCode":
          newFieldErrors.verificationCode = error.msg;
          stepToNavigate = 2;
          break;
        case "fullName":
          newFieldErrors.fullName = error.msg;
          stepToNavigate = 3;
          break;
        case "password":
          newFieldErrors.password = error.msg;
          stepToNavigate = 4;
          break;
        case "confirmPassword":
          newFieldErrors.confirmPassword = error.msg;
          stepToNavigate = 5;
          break;
        case "agreeToTerms":
          newFieldErrors.terms = error.msg;
          stepToNavigate = 5;
          break;
        default:
          generalError = error.msg;
      }
    });

    setFieldErrors(newFieldErrors);
    if (generalError) setError(generalError);
    if (stepToNavigate) setCurrentStep(stepToNavigate);
  };
  
  // Handle error messages from API
  const handleErrorMessage = (message) => {
    if (message.toLowerCase().includes("email")) {
      setFieldErrors({ ...fieldErrors, email: message });
      setCurrentStep(1);
    } else if (message.toLowerCase().includes("verification") || message.toLowerCase().includes("code")) {
      setFieldErrors({ ...fieldErrors, verificationCode: message });
      setCurrentStep(2);
    } else if (message.toLowerCase().includes("name")) {
      setFieldErrors({ ...fieldErrors, fullName: message });
      setCurrentStep(3);
    } else if (message.toLowerCase().includes("password")) {
      setFieldErrors({ ...fieldErrors, password: message });
      setCurrentStep(4);
    } else if (message.toLowerCase().includes("terms")) {
      setFieldErrors({ ...fieldErrors, terms: message });
      setCurrentStep(5);
    } else {
      setError(message);
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
        setIsCurrentFieldFocused(formData.verificationCode.length > 0);
        break;
      case 3:
        setIsCurrentFieldFocused(formData.fullName.length > 0);
        break;
      case 4:
        setIsCurrentFieldFocused(formData.password.length > 0);
        break;
      case 5:
        setIsCurrentFieldFocused(formData.confirmPassword.length > 0);
        break;
      default:
        setIsCurrentFieldFocused(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isCurrentStepValid()) {
        handleSubmit(e);
      }
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  // Progress indicator calculation
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  // Step headings and descriptions
  const stepInfo = {
    1: { heading: "Let's get started", subheading: "Enter your email address" },
    2: { heading: "Verify your email", subheading: "Enter the code we sent to your email" },
    3: { heading: "Personal info", subheading: "What should we call you?" },
    4: { heading: "Create a password", subheading: "Make it strong and secure" },
    5: { heading: "Confirm details", subheading: "Almost there!" }
  };
  
  // Password strength
  const passwordStrength = calculatePasswordStrength(formData.password);

  // Social login handlers
  const handleSocialLogin = (provider) => {
    console.log(`Logging in with ${provider}`);
    setError(`${provider} login is not implemented in this demo`);
  };

  // Canvas animation
  const canvasRef = useRef(null);

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
  
        <h1>{registrationSuccess ? "Success!" : stepInfo[currentStep].heading}</h1>
        <p className="subtitle">
          {registrationSuccess ? "Your account has been created" : stepInfo[currentStep].subheading}
        </p>
  
        {/* Success message display */}
        {registrationSuccess && (
          <div className="success-message" role="alert">
            <div className="success-icon">✓</div>
            <div>Registration successful! Redirecting to login...</div>
          </div>
        )}
  
        {/* Error message display */}
        {error && <div className="error-message" role="alert">{error}</div>}
  
        {!registrationSuccess && (
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
  
            {/* Step 2: Verification Code */}
            {currentStep === 2 && (
              <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.verificationCode ? 'error' : ''}`}>
                <input
                  ref={inputRefs[2]}
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  autoComplete="off"
                  aria-invalid={!!fieldErrors.verificationCode}
                  aria-describedby={fieldErrors.verificationCode ? "verificationCodeError" : undefined}
                  required
                />
                <label className='vfcode' htmlFor="verificationCode">Verification Code</label>
                <span className="input-highlight"></span>
                {fieldErrors.verificationCode && (
                  <div className="field-error" id="verificationCodeError" role="alert">
                    {fieldErrors.verificationCode}
                  </div>
                )}
                <div className="verification-info">
                  <p>We sent a verification code to <strong>{formData.email}</strong></p>
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={handleResendVerification}
                    disabled={isLoading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            )}
  
            {/* Step 3: Full Name */}
            {currentStep === 3 && (
              <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.fullName ? 'error' : ''}`}>
                <input
                  ref={inputRefs[3]}
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  autoComplete="name"
                  aria-invalid={!!fieldErrors.fullName}
                  aria-describedby={fieldErrors.fullName ? "fullNameError" : undefined}
                  required
                />
                <label htmlFor="fullName">Full Name</label>
                <span className="input-highlight"></span>
                {fieldErrors.fullName && (
                  <div className="field-error" id="fullNameError" role="alert">{fieldErrors.fullName}</div>
                )}
              </div>
            )}
  
            {/* Step 4: Password */}
            {currentStep === 4 && (
              <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.password ? 'error' : ''}`}>
                <div className="password-input-wrapper">
                  <input
                    ref={inputRefs[4]}
                    type={passwordVisible ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "passwordError" : "passwordStrength"}
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
  
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="password-strength" id="passwordStrength">
                    <div className="strength-meter">
                      <span style={{ color: passwordStrength.color || 'inherit' }}>
                        {passwordStrength.label}
                      </span>
                      <div className="meter-bg">
                        <div 
                          className="meter-fill" 
                          style={{
                            width: `${passwordStrength.percentage}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        ></div>
                      </div>
                    </div>
                    <ul className="password-tips">
                      <li className={formData.password.length >= 6 ? "met" : ""}>
                        Use at least 6 characters
                      </li>
                      <li className={/[0-9]/.test(formData.password) ? "met" : ""}>
                        Include numbers
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(formData.password) ? "met" : ""}>
                        Include special characters (!@#$%^&*)
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
  
            {/* Step 5: Confirm Password and Terms */}
            {currentStep === 5 && (
              <>
                <div className={`input-group ${isCurrentFieldFocused ? 'focused' : ''} ${fieldErrors.confirmPassword ? 'error' : ''}`}>
                  <div className="password-input-wrapper">
                    <input
                      ref={inputRefs[5]}
                      type={confirmPasswordVisible ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      autoComplete="new-password"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? "confirmPasswordError" : undefined}
                      required
                    />
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <button 
                      type="button" 
                      className="toggle-password" 
                      onClick={toggleConfirmPasswordVisibility}
                      aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {confirmPasswordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="input-highlight"></span>
                  {fieldErrors.confirmPassword && (
                    <div className="field-error" id="confirmPasswordError" role="alert">{fieldErrors.confirmPassword}</div>
                  )}
                </div>
  
                <div className={`options-row ${fieldErrors.terms ? 'error' : ''}`}>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      aria-invalid={!!fieldErrors.terms}
                      aria-describedby={fieldErrors.terms ? "termsError" : undefined}
                      required
                    />
                    <span className="custom-checkbox"></span>
                    I agree to the <a href="/terms" target="_blank">Terms</a> & <a href="/privacy" target="_blank">Privacy Policy</a>
                  </label>
                  
                  {fieldErrors.terms && (
                    <div className="field-error terms-error" id="termsError" role="alert">{fieldErrors.terms}</div>
                  )}
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
                aria-label={currentStep === totalSteps ? 'Create account' : 'Continue to next step'}
              >
                {isLoading ? (
                  <span className="loader" aria-hidden="true"></span>
                ) : (
                  currentStep === totalSteps ? 'Create Account' : 'Continue'
                )}
              </button>
            </div>
          </form>
        )}
  
        {/* Show login link immediately on success */}
        {registrationSuccess ? (
          <div className="success-login-link">
            <a href="/login" className="login-link-button">Go to Login</a>
          </div>
        ) : (
          <>
            
  
            <p className="signup-prompt">
              Already have an account? <a href="/login">Sign in</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RegistrationPage;