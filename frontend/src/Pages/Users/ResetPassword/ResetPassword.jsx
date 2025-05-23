import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) return "Password must be at least 8 characters long";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumbers) return "Password must contain at least one number";
    if (!hasSpecialChar) return "Password must contain at least one special character";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:5100/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess("Password reset successful! Redirecting to login...");
    } catch (error) {
      setError(error.message || "An error occurred while resetting password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="card-header">
          <h2>Reset Password</h2>
          <p>Please enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                aria-describedby="password-requirements"
              />
              <svg 
                className="password-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 17a5 5 0 0 1 0-10" />
                <path d="M21 12c-2.21 1.68-4.93 3-9 3" />
                <path d="M3 12c2.21-1.68 4.93-3 9-3" />
                <path d="M7 12h10" />
                <line x1="19" y1="8" x2="5" y2="16" strokeWidth="1.5" strokeOpacity={showPassword ? "0" : "1"} />
              </svg>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <svg 
                className="password-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 17a5 5 0 0 1 0-10" />
                <path d="M21 12c-2.21 1.68-4.93 3-9 3" />
                <path d="M3 12c2.21-1.68 4.93-3 9-3" />
                <path d="M7 12h10" />
                <line x1="19" y1="8" x2="5" y2="16" strokeWidth="1.5" strokeOpacity={showPassword ? "0" : "1"} />
              </svg>
            </div>
          </div>

          <div id="password-requirements" className="password-requirements">
            <h3>Password Requirements</h3>
            <ul>
              <li className={newPassword.length >= 8 ? "met" : ""}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(newPassword) ? "met" : ""}>
                One uppercase letter
              </li>
              <li className={/[a-z]/.test(newPassword) ? "met" : ""}>
                One lowercase letter
              </li>
              <li className={/\d/.test(newPassword) ? "met" : ""}>
                One number
              </li>
              <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "met" : ""}>
                One special character
              </li>
            </ul>
          </div>

          {error && (
            <div className="alert error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="alert success" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="submit-button"
          >
            {isLoading ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
                <span>Resetting...</span>
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="back-to-login">
            <a href="/login">Back to login</a>
          </div>
        </form>
      </div>

      <style>{`
       

        .reset-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background-color: var(--bg-dark);
          color: var(--text-primary);
        }

        .reset-password-card {
          width: 100%;
          max-width: 28rem;
          background: var(--card-bg);
          border-radius: 0.75rem;
          box-shadow: var(--card-shadow);
          padding: 2.5rem;
          border: 1px solid var(--border-color);
          transition: transform var(--transition-speed), box-shadow var(--transition-speed);
        }
        
        .reset-password-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        }

        .card-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .card-header h2 {
          color: var(--text-primary);
          font-size: 1.75rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          letter-spacing: 0.5px;
        }

        .card-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.95rem;
        }

        .reset-password-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          color: var(--text-primary);
          font-weight: 500;
          font-size: 0.9rem;
          margin-left: 0.25rem;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          background-color: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          font-size: 1rem;
          color: var(--text-primary);
          transition: all var(--transition-speed);
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-hover);
        }

        .input-wrapper input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .input-wrapper input:disabled {
          background-color: rgba(26, 26, 26, 0.7);
          color: var(--text-secondary);
          cursor: not-allowed;
        }

        .password-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: var(--accent-color);
        }

        .toggle-password {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          transition: color var(--transition-speed);
        }

        .toggle-password:hover {
          color: var(--accent-color);
        }

        .toggle-password:focus {
          outline: none;
          color: var(--accent-color);
        }

        .password-requirements {
          padding: 1rem;
          border-radius: 0.5rem;
          background-color: rgba(40, 40, 40, 0.5);
          border: 1px solid var(--border-color);
        }

        .password-requirements h3 {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }

        .password-requirements ul {
          list-style: none;
          padding-left: 0.5rem;
          margin: 0;
        }

        .password-requirements li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
          transition: color var(--transition-speed);
        }

        .password-requirements li::before {
          content: "○";
          color: var(--text-secondary);
          transition: color var(--transition-speed);
        }

        .password-requirements li.met {
          color: var(--accent-green);
        }

        .password-requirements li.met::before {
          content: "●";
          color: var(--accent-green);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
        }

        .alert svg {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }

        .alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .alert.success {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.5rem;
          background-color: var(--accent-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-speed);
          position: relative;
          overflow: hidden;
        }

        .submit-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .submit-button:hover:not(:disabled):before {
          transform: translateX(100%);
        }

        .submit-button:hover:not(:disabled) {
          background-color: rgba(52, 152, 219, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--glow-color);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          background-color: var(--bg-dark-lighter);
          color: var(--text-secondary);
          cursor: not-allowed;
        }

        .spinner {
          width: 1.25rem;
          height: 1.25rem;
          animation: spin 1.2s linear infinite;
          stroke: currentColor;
          stroke-dasharray: 60, 180;
        }

        .back-to-login {
          text-align: center;
          margin-top: 0.5rem;
        }

        .back-to-login a {
          color: var(--accent-color);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color var(--transition-speed);
        }

        .back-to-login a:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .reset-password-card {
            padding: 2rem 1.5rem;
          }
          
          .card-header h2 {
            font-size: 1.5rem;
          }
          
          .password-requirements {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;