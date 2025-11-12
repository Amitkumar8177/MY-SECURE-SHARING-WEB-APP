// frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Path relative to ProtectedRoute.js

const ProtectedRoute = ({ component: Component, adminOnly = false, ...rest }) => {
    const { isLoggedIn, is_admin } = useAuth();

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !is_admin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Component {...rest} />;
};

export default ProtectedRoute;