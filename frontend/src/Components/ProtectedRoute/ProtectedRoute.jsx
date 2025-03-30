// ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../App"; // Adjust the path as needed

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isLoggedIn, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="auth-loading">Verifying authentication...</div>;
  }
  
  // Redirect to login with return path if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default ProtectedRoute;