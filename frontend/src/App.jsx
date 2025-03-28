import React from 'react';
import Navbar from './Components/Navbar/Navbar'; // Import the Navbar we created earlier
import NetworkDashboard from './Pages/Home';
import './App.css'; // Import the CSS file

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <main className="content-area">
          <NetworkDashboard />
        </main>
      </div>
    </div>
  );
}

export default App;