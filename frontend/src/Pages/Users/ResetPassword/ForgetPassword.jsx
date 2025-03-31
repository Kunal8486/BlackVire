import { useState } from "react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:5100/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      setSuccess("Password reset link has been sent to your email");
      setEmail("");
    } catch (error) {
      setError(error.message || "An error occurred while sending the reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="card-header">
          <h2>Reset Password</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                required
                aria-describedby={error ? "error-message" : undefined}
              />
              <svg 
                className="email-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
          </div>

          {error && (
            <div className="alert error" role="alert" id="error-message">
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
            disabled={isLoading || !email}
            className="submit-button"
          >
            {isLoading ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

          <div className="back-to-login">
            <a href="/login">Return to login</a>
          </div>
        </form>
      </div>

      <style>{`
       
        .forgot-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background-color: var(--bg-dark);
          color: var(--text-primary);
        }

        .forgot-password-card {
          width: 100%;
          max-width: 28rem;
          background: var(--card-bg);
          border-radius: 0.75rem;
          box-shadow: var(--card-shadow);
          padding: 2.5rem;
          border: 1px solid var(--border-color);
          transition: transform var(--transition-speed), box-shadow var(--transition-speed);
        }
        
        .forgot-password-card:hover {
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

        .forgot-password-form {
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

        .email-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: var(--accent-color);
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
          .forgot-password-card {
            padding: 2rem 1.5rem;
          }
          
          .card-header h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;