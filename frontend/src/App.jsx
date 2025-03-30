import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import Footer from "./Components/Footer/Footer";
import Home from "./Pages/Home/Home";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Login from "./Pages/Users/Login/Login";
import Register from "./Pages/Users/Register/Register";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";
import Profile from "./Pages/Users/Profile/Profile";
import "./App.css";

// Create auth context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Token management functions
const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const removeToken = () => localStorage.removeItem("token");

// API URL constant (consider moving to .env file)
const API_URL = "http://localhost:5100/api";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Function to fetch user data from the API
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setIsLoggedIn(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsLoggedIn(true);
        setAuthError(null);
      } else if (response.status === 401) {
        // Handle token expiration or invalid token
        handleLogout();
        setAuthError("Session expired. Please log in again.");
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setAuthError("Could not verify authentication status.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on app load
  useEffect(() => {
    fetchUserData();
    
    // Set up token expiration check
    const tokenInterval = setInterval(() => {
      // If token exists, check its validity
      if (getToken()) {
        fetchUserData();
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    return () => clearInterval(tokenInterval);
  }, []);

  const handleLogin = async (token, userData = null) => {
    setToken(token);
    setIsLoggedIn(true);
    setAuthError(null);

    if (userData) {
      setUser(userData);
    } else {
      // If userData not provided with login, fetch it
      await fetchUserData();
    }
  };

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('user'); // Clear any user data
    setIsLoggedIn(false);
    setUser(null);
  };

  // Function to refresh user data (can be called after profile updates)
  const refreshUserData = async () => {
    await fetchUserData();
  };

  const authContextValue = {
    isLoggedIn,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    user,
    refreshUserData,
    authError
  };

  if (isLoading && !isLoggedIn) {
    return <div className="loading-screen">Loading BlackVire...</div>;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="app-content">
            {authError && !isLoading && (
              <div className="auth-error-banner">{authError}</div>
            )}
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Home />} />

              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Logout Route */}
              <Route 
                path="/logout" 
                element={
                  <LogoutRoute logout={handleLogout} />
                } 
              />

              {/* Fallback - 404 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

// Separate LogoutRoute component
const LogoutRoute = ({ logout }) => {
  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
};

export default App;