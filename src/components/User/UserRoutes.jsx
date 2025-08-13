import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserDashboard from './UserDashboard';
import ProductDetail from './ProductDetail';

const UserRoutes = () => {
    const { currentUser } = useAuth();

    // Redirect to login if no user is authenticated
    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    return (
        <Routes>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/product/:productId" element={<ProductDetail />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
            {/* Add more routes as needed */}
        </Routes>
    );
};

export default UserRoutes;
