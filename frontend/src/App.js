// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute'; // Corrected path based on your clarification
import './App.css'; // Main application styles (non-neon)

function App() {
  const { isLoggedIn, is_admin, logout } = useAuth();

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav>
            <Link to="/" className="nav-link">Home</Link>
            {!isLoggedIn && <Link to="/register" className="nav-link">Register</Link>}
            {!isLoggedIn && <Link to="/login" className="nav-link">Login</Link>}
            {isLoggedIn && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
            {isLoggedIn && is_admin && <Link to="/admin-dashboard" className="nav-link">Admin Panel</Link>}
            {isLoggedIn && <button onClick={logout} className="nav-logout-button">Logout</button>}
          </nav>
        </header>

        <main>
          <Routes>
            {/* Root path: Redirect based on login status */}
            <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Route for Dashboard (requires login) */}
            <Route path="/dashboard" element={<ProtectedRoute component={Dashboard} />} />

            {/* Protected Route for Admin Dashboard (requires login AND admin privileges) */}
            <Route
              path="/admin-dashboard"
              element={<ProtectedRoute component={AdminDashboard} adminOnly={true} />}
            />

            {/* Catch-all route for unmatched paths */}
            <Route path="*" element={<p className="status-message error">404 - Page Not Found</p>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;