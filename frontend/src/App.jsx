// App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer/Footer';
import Home from './Pages/Home/Home';
import Dashboard from './Pages/Dashboard/Dashboard';

import './App.css';

const App = () => {
  const [loading, setLoading] = useState(false);

  return (
    <Router>
      <div className="app">
        <Navbar />
        
        <main className="app-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Add more routes as needed */}
              
              {/* Catch-all route for 404 */}
              <Route path="*" element={<div className="not-found">404 - Page Not Found</div>} />
            </Routes>
          )}
        </main>
        
        <Footer />
      </div>
    </Router>
  );
};

export default App;