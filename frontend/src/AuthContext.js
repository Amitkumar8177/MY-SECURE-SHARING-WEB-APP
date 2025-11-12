// frontend/src/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    is_admin: localStorage.getItem('is_admin') === 'true',
    userId: localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null // Add userId here
  });

  // Update the login function to also store userId
  const login = useCallback((token, username, is_admin, userId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('is_admin', is_admin);
    localStorage.setItem('userId', userId); // Store userId
    setAuthState({ token, username, is_admin: is_admin, userId: userId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('userId'); // Remove userId
    setAuthState({ token: null, username: null, is_admin: false, userId: null });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const storedUserId = localStorage.getItem('userId');
    const userId = storedUserId ? parseInt(storedUserId) : null; // Retrieve and parse userId

    if (token && username) {
      setAuthState({ token, username, is_admin: isAdmin, userId: userId });
    } else {
      setAuthState({ token: null, username: null, is_admin: false, userId: null });
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      token: authState.token,
      username: authState.username,
      isLoggedIn: !!authState.token,
      is_admin: authState.is_admin,
      userId: authState.userId, // Expose userId
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};