// frontend/src/components/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // For common styles

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages

    if (!username || !email || !password) {
      setMessageType('error');
      setMessage('Please enter all fields.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage(data.message);
        // Optionally redirect to login after successful registration
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessageType('error');
        setMessage(data.message || 'Registration failed.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessageType('error');
      setMessage('Network error or server unreachable.');
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
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
        <button type="submit" className="primary-button">Register</button>
      </form>
      {message && <p className={`status-message ${messageType}`}>{message}</p>}
    </div>
  );
};

export default Register;