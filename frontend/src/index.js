// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Global styles
import App from './App';
import { AuthProvider } from './AuthContext'; // Import AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap your entire App with AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);