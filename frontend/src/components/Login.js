// frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import '../App.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!email || !password) {
      setMessageType('error');
      setMessage('Please enter all fields.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(data.message);
        // FIX: Pass data.user.id to the login function
        login(data.token, data.user.username, data.user.is_admin, data.user.id); // <--- FIX

        setTimeout(() => {
          if (data.user.is_admin) {
            navigate('/admin-dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 1000);
      } else {
        setMessageType('error');
        setMessage(data.message || 'Login failed.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessageType('error');
      setMessage('Network error or server unreachable.');
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="primary-button">Login</button>
      </form>
      {message && <p className={`status-message ${messageType}`}>{message}</p>}
    </div>
  );
};

export default Login;