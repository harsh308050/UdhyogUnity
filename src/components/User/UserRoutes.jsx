import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserDashboard from './UserDashboard';
import ProductDetail from './ProductDetail';
import UserBookings from './BookingSelector'; // Using the selector to choose between legacy and enhanced
import ServiceBooking from './ServiceBooking'; // Keep this for backward compatibility

const UserRoutes = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Handle service booking routes by redirecting to dashboard with state
    useEffect(() => {
        // Check if the current route is a service booking route
        if (location.pathname.includes('/service/')) {
            const segments = location.pathname.split('/');
            const serviceId = segments[segments.length - 2];
            const businessId = segments[segments.length - 1];

            if (serviceId && businessId) {
                // Get any service data from session storage
                let serviceData = null;
                try {
                    const savedService = sessionStorage.getItem('bookingService');
                    if (savedService) {
                        serviceData = JSON.parse(savedService);
                        // Clear session storage
                        sessionStorage.removeItem('bookingService');
                    }
                } catch (error) {
                    console.error("Error parsing service data from session storage:", error);
                }

                // Redirect to dashboard with state
                navigate('/dashboard', {
                    state: {
                        openServiceBooking: true,
                        serviceId,
                        businessId,
                        serviceData
                    },
                    replace: true // Replace the history entry to prevent going back to this route
                });
            }
        }
    }, [location, navigate]);

    // Redirect to login if no user is authenticated
    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    return (
        <Routes>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/product/:productId" element={<ProductDetail />} />
            <Route path="/bookings" element={<UserBookings />} />
            {/* Keep the service routes for backward compatibility, but they'll be redirected */}
            <Route path="/service/:serviceId/:businessId" element={<ServiceBooking />} />
            <Route path="service/:serviceId/:businessId" element={<ServiceBooking />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
};

export default UserRoutes;

// export default UserRoutes;
