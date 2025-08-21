import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, MessageSquare, Settings, LogOut, Package, Heart, ShoppingBag, User } from 'react-feather';
import './UserDashboard.css';
import { useAuth } from '../../context/AuthContext';
import { getUserFromFirestore } from '../../Firebase/db';
import { auth } from '../../Firebase/auth';
import { signOut } from 'firebase/auth';
import UserBookings from './BookingSelector';
import UserFavorites from './UserFavorites';
import UserProfileSettings from './UserProfileSettings';
import UserExplore from './UserExplore';
import UserMessages from './UserMessages';
import UserOrders from './UserOrders';
import ServiceBookingModal from './ServiceBookingModal';
import { getCustomerBookings } from '../../Firebase/bookingDb';
import { getCustomerOrders } from '../../Firebase/ordersDb';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../Firebase/config';

function UserDashboard() {
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [stats, setStats] = useState({
        upcomingBookings: 0,
        pendingOrders: 0,
        savedBusinesses: 0,
        recentReviews: 0
    });
    const [serviceToBook, setServiceToBook] = useState(null);
    const [serviceLoading, setServiceLoading] = useState(false);

    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Get user data or fetch from Firestore
        const loadData = async () => {
            try {
                if (currentUser && currentUser.email) {
                    // Try to fetch from Firestore
                    console.log("Fetching user data for email:", currentUser.email);
                    const firestoreData = await getUserFromFirestore(currentUser.email);

                    if (firestoreData) {
                        console.log("Retrieved user data from Firestore:", firestoreData);
                        console.log("Profile photo URL:", firestoreData.photoURL);

                        // Check if photoURL is a string or an object
                        if (firestoreData.photoURL && typeof firestoreData.photoURL === 'object') {
                            console.log("photoURL is an object, extracting URL property:", firestoreData.photoURL);
                            firestoreData.photoURL = firestoreData.photoURL.url || firestoreData.photoURL.toString();
                        }

                        setUserData(firestoreData);
                    } else {
                        // No data found, use demo data
                        console.log("No user data found, using demo data");
                    }

                    // Load real stats from Firebase
                    await loadUserStats(currentUser.email);
                } else {
                    // No user found, use demo data
                    console.log("No current user, using demo data");
                }
            } catch (err) {
                console.error("Error user-loading user data:", err);
            }
        };

        loadData();

        // Check if we need to redirect to a specific tab from sessionStorage
        const redirectToTab = sessionStorage.getItem('redirectToTab');
        if (redirectToTab) {
            setActiveTab(redirectToTab);
            // Clear the sessionStorage after redirection
            sessionStorage.removeItem('redirectToTab');
        }
    }, [currentUser]);

    // Check for service booking information in location state
    useEffect(() => {
        if (location.state?.openServiceBooking) {
            const { serviceId, businessId, serviceData } = location.state;

            // If we already have the service data, use it directly
            if (serviceData) {
                setServiceToBook(serviceData);
                // Set active tab to explore to show the correct background content
                setActiveTab('explore');
                // Clear the location state
                navigate(location.pathname, { replace: true, state: {} });
                return;
            }

            // Otherwise, we need to fetch the service data from Firestore
            const fetchServiceData = async () => {
                setServiceLoading(true);
                try {
                    // Try multiple paths to find the service
                    const paths = [
                        `Services/${businessId}/Active/${serviceId}`,
                        `Businesses/${businessId}/services/${serviceId}`,
                        `Services/${businessId}/${serviceId}`
                    ];

                    let serviceData = null;

                    // Try each path
                    for (const path of paths) {
                        console.log(`Attempting to fetch service from path: ${path}`);
                        const serviceDoc = await getDoc(doc(db, path));

                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceId,
                                businessId: businessId,
                                ...serviceDoc.data()
                            };
                            console.log(`Service data found at path: ${path}`, serviceData);
                            break;
                        }
                    }

                    if (serviceData) {
                        setServiceToBook(serviceData);
                        // Set active tab to explore to show the correct background content
                        setActiveTab('explore');
                    } else {
                        console.error(`Service not found for ID: ${serviceId} and business ID: ${businessId}`);
                        // Handle the case when service is not found
                        alert("Service not found. Please try again.");
                    }
                } catch (error) {
                    console.error("Error fetching service data:", error);
                    alert("Error loading service details. Please try again.");
                } finally {
                    setServiceLoading(false);
                    // Clear the location state
                    navigate(location.pathname, { replace: true, state: {} });
                }
            };

            fetchServiceData();
        }
    }, [location, navigate]);

    // Load real user statistics from Firebase
    const loadUserStats = async (userEmail) => {
        try {
            // Get upcoming bookings
            const bookings = await getCustomerBookings(userEmail);

            console.log("All bookings:", bookings);

            // Filter and sort bookings on client side
            const upcomingBookings = bookings.filter(booking => {
                const bookingDate = booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime);
                const bookingStatus = booking.status?.toLowerCase() || '';

                // Only show future bookings that are neither cancelled nor completed
                return bookingDate > new Date() &&
                    bookingStatus !== 'cancelled' &&
                    bookingStatus !== 'completed';
            });

            console.log("Filtered upcoming bookings:", upcomingBookings);

            // Get saved businesses and products using new schema - wrap in try-catch to handle if collections don't exist
            let savedBusinessesCount = 0;
            let savedProductsCount = 0;

            try {
                const userFavoritesRef = doc(db, "UserFavorites", userEmail);
                const businessesCollectionRef = collection(userFavoritesRef, "Businesses");
                const productsCollectionRef = collection(userFavoritesRef, "Products");

                const [businessesSnapshot, productsSnapshot] = await Promise.all([
                    getDocs(businessesCollectionRef),
                    getDocs(productsCollectionRef)
                ]);

                savedBusinessesCount = businessesSnapshot.size;
                savedProductsCount = productsSnapshot.size;
            } catch (err) {
                console.log("Error fetching favorites:", err);
                // Just continue with zeros
            }

            // Get pending orders - wrap in try-catch
            let pendingOrders = 0;

            try {
                const orders = await getCustomerOrders(userEmail);
                console.log("All customer orders:", orders);

                pendingOrders = orders.filter(order => {
                    // Convert to lowercase to handle case variations
                    const orderStatus = order.status?.toLowerCase() || '';

                    // Only count orders that are genuinely pending/in progress
                    // Exclude completed, delivered, cancelled, and picked up orders
                    return !['picked up', 'cancelled', 'completed', 'delivered'].includes(orderStatus);
                }).length;

                console.log("Filtered pending orders:", pendingOrders);
            } catch (err) {
                console.log("Error fetching orders:", err);
                // Just continue with zero
            }

            // Set the stats
            setStats({
                upcomingBookings: upcomingBookings.length,
                pendingOrders: pendingOrders,
                savedBusinesses: savedBusinessesCount,
                savedProducts: savedProductsCount,
                recentReviews: 0 // Placeholder until review system is implemented
            });
        } catch (error) {
            console.error("Error user-loading user stats:", error);
            // Use default stats if there's an error
            setStats({
                upcomingBookings: 0,
                pendingOrders: 0,
                savedBusinesses: 0,
                savedProducts: 0,
                recentReviews: 0
            });
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Render placeholder content for different tabs
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="user-dashboard-content">
                        <div className="user-welcome-section">
                            <h1 className="user-welcome-header">Welcome back, {userData?.firstName || 'User'} </h1>
                            <p>Discover local businesses and services in your area</p>
                            <button className="user-btn-primary user-explore-btn" onClick={() => setActiveTab('explore')}>
                                <Search size={18} />
                                <span>Explore Businesses</span>
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="user-stats-section">
                            <h2>Quick Stats</h2>
                            <div className="user-stats-grid">
                                <div className="user-stat-card">
                                    <div className="user-stat-icon">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="user-stat-info">
                                        <h3>Upcoming Bookings</h3>
                                        <p className="user-stat-value">{stats.upcomingBookings} Scheduled</p>
                                    </div>
                                </div>

                                <div className="user-stat-card">
                                    <div className="user-stat-icon">
                                        <Package size={24} />
                                    </div>
                                    <div className="user-stat-info">
                                        <h3>Pending Orders</h3>
                                        <p className="user-stat-value">{stats.pendingOrders} Order{stats.pendingOrders !== 1 ? 's' : ''} to Pick Up</p>
                                    </div>
                                </div>

                                <div className="user-stat-card">
                                    <div className="user-stat-icon">
                                        <Heart size={24} />
                                    </div>
                                    <div className="user-stat-info">
                                        <h3>Saved Businesses</h3>
                                        <p className="user-stat-value">{stats.savedBusinesses} Saved Profiles</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                );
            case 'explore':
                return <UserExplore />;
            case 'bookings':
                return <UserBookings />;
            case 'messages':
                return <UserMessages />;
            case 'favorites':
                return <UserFavorites />;
            case 'orders':
                return <UserOrders />;
            case 'profile':
                return <UserProfileSettings />;
            default:
                return <div>Select a tab to view content</div>;
        }
    };

    if (!userData) {
        return (
            <div className="user-dashboard-theme">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading user data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-dashboard-theme">
            <div className="user-dashboard-container">
                <aside className="user-sidebar">
                    <div className="user-sidebar-header">
                        <h3>UdhyogUnity</h3>
                    </div>

                    <nav className="user-sidebar-nav">
                        <ul>
                            <li className={activeTab === 'home' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('home')}>
                                    <Home size={20} />
                                    <span>Home</span>
                                </button>
                            </li>
                            <li className={activeTab === 'explore' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('explore')}>
                                    <Search size={20} />
                                    <span>Explore</span>
                                </button>
                            </li>
                            <li className={activeTab === 'bookings' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('bookings')}>
                                    <Calendar size={20} />
                                    <span>My Bookings</span>
                                </button>
                            </li>
                            <li className={activeTab === 'orders' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('orders')}>
                                    <ShoppingBag size={20} />
                                    <span>My Orders</span>
                                </button>
                            </li>
                            <li className={activeTab === 'favorites' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('favorites')}>
                                    <Heart size={20} />
                                    <span>Favorites</span>
                                </button>
                            </li>
                            <li className={activeTab === 'messages' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('messages')}>
                                    <MessageSquare size={20} />
                                    <span>Messages</span>
                                </button>
                            </li>
                            <li className={activeTab === 'profile' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('profile')}>
                                    <User size={20} />
                                    <span>Profile</span>
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="user-sidebar-footer">
                        <button className="user-logout-button" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>

                <main className="user-dashboard-main">
                    <header className="user-dashboard-header">
                        <div className="user-header-content">
                            <h2>{userData.firstName} {userData.lastName}</h2>
                            <div className="user-menu">
                                <div className="user-user-avatar">
                                    {userData.photoURL ? (
                                        <img
                                            src={userData.photoURL}
                                            alt={`${userData.firstName} ${userData.lastName}`}
                                            className="user-user-photo"
                                            onError={(e) => {
                                                console.log("Photo failed to load:", e);
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerText = userData.firstName?.charAt(0) || 'U';
                                            }}
                                        />
                                    ) : (
                                        userData.firstName?.charAt(0) || 'U'
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="user-main-content">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Service Booking Modal */}
            {serviceToBook && (
                <ServiceBookingModal
                    service={serviceToBook}
                    onClose={() => setServiceToBook(null)}
                    onSuccess={(bookingDetails) => {
                        console.log("Booking successful:", bookingDetails);
                        setServiceToBook(null);
                        // Navigate to the bookings tab
                        setActiveTab('bookings');
                    }}
                />
            )}

            {/* Loading overlay for service data */}
            {serviceLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Loading service details...</p>
                </div>
            )}
        </div>
    );
}

export default UserDashboard;
