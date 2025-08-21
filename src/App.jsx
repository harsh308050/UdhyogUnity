import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import BusinessLogin from "./components/BusinessLogin";
import BusinessDashboard from "./components/BusinessOwner/BusinessDashboard";
import RegisterBusiness from "./components/RegisterBusiness";
import UserDashboard from "./components/User/UserDashboard";
import ProductDetail from "./components/User/ProductDetail";
import UserFavorites from "./components/User/UserFavorites";
import UserBookings from "./components/User/UserBookings";
import UserProfileSettings from "./components/User/UserProfileSettings";
import ServiceBooking from "./components/User/ServiceBooking";
import BusinessDetails from "./components/User/BusinessDetails";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

const RedirectIfLoggedIn = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Redirect to dashboard if user is already logged in
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<RedirectIfLoggedIn><LandingPage /></RedirectIfLoggedIn>} />
      <Route path="/register-business" element={<RegisterBusiness />} />
      <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
      <Route path="/business-login" element={<BusinessLogin />} />
      <Route path="/business-dashboard" element={<BusinessDashboard />} />

      {/* User Dashboard Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/product/:productId" element={
        <ProtectedRoute>
          <ProductDetail />
        </ProtectedRoute>
      } />
      <Route path="/favorites" element={
        <ProtectedRoute>
          <UserFavorites />
        </ProtectedRoute>
      } />
      <Route path="/bookings" element={
        <ProtectedRoute>
          <UserBookings />
        </ProtectedRoute>
      } />
      <Route path="/profile-settings" element={
        <ProtectedRoute>
          <UserProfileSettings />
        </ProtectedRoute>
      } />
      <Route path="/service/:serviceId/:businessId" element={
        <ProtectedRoute>
          <ServiceBooking />
        </ProtectedRoute>
      } />
      <Route path="/service/:businessId/:serviceId" element={
        <ProtectedRoute>
          <ServiceBooking />
        </ProtectedRoute>
      } />

      <Route path="/business/:businessId" element={
        <ProtectedRoute>
          <BusinessDetails />
        </ProtectedRoute>
      } />

      {/* Redirect any other path to dashboard for authenticated users */}
      <Route path="*" element={
        <ProtectedRoute>
          <Navigate to="/dashboard" />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  // Add event listener for when the user closes the tab or navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This won't actually have time to run on page close, but we're using 
      // session persistence anyway which will clear when the browser is closed
      console.log("Page is being closed");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;