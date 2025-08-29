import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Package, Calendar, MessageSquare, Settings, LogOut, Star, Clock, ShoppingBag, Shield, List } from 'react-feather';
import './BusinessDashboard.css';
import ProductManagement from './Products/ProductManagement';
import ServiceManagement from './Services/ServiceManagement';
import SettingsManagement from './Settings/SettingsManagement';
import BusinessMessages from './Messages/BusinessMessages';
import OrdersManagement from './Orders/OrdersManagement';
import EnhancedBookingManagement from './Services/Bookings/EnhancedBookingManagement';
import { getBusinessDataFromFirestore, getCurrentBusinessEmail } from '../../Firebase/getBusinessData';
import { fetchDashboardStats } from '../../Firebase/dashboardStats';
import { IndianRupee } from 'lucide-react';

function BusinessDashboard() {
    const [businessData, setBusinessData] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Get business data from session storage or fetch from Firestore
        const loadData = async () => {
            try {
                setLoading(true);
                let businessData = null;

                // First try session storage
                const storedBusinessData = sessionStorage.getItem('businessData');
                if (storedBusinessData) {
                    businessData = JSON.parse(storedBusinessData);
                    console.log("Retrieved business data from session storage:", businessData);
                }

                // If no session data or incomplete data, try to fetch from Firestore
                if (!businessData || !businessData.email) {
                    console.log("No valid session data, trying to fetch from Firestore...");
                    const email = getCurrentBusinessEmail();
                    if (email) {
                        console.log("Fetching business data for email:", email);
                        const firestoreData = await getBusinessDataFromFirestore(email);
                        if (firestoreData) {
                            businessData = firestoreData;
                            console.log("Retrieved business data from Firestore:", firestoreData);
                            // Update session storage with fresh data
                            sessionStorage.setItem('businessData', JSON.stringify(firestoreData));
                        }
                    }
                }

                if (businessData) {
                    // Log if we have a logo in the business data
                    if (businessData.logo) {
                        console.log("Found logo in business data:", businessData.logo);
                    } else {
                        console.log("No logo found in business data");
                    }

                    setBusinessData(businessData);

                    // Fetch dashboard stats
                    try {
                        const stats = await fetchDashboardStats(businessData.email);
                        console.log("Fetched dashboard stats:", stats);
                        setDashboardStats(stats);
                    } catch (statsError) {
                        console.error("Error fetching dashboard stats:", statsError);
                    }
                } else {
                    console.error("No business data available");
                    // Redirect to login if no business data found
                    navigate('/business-login');
                }
            } catch (error) {
                console.error('Error loading business data:', error);
                // Redirect to login on error
                navigate('/business-login');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    // Helper function to extract logo URL
    const extractLogoUrl = (logoData) => {
        if (!logoData) return null;

        if (typeof logoData === 'string') {
            return logoData;
        }

        if (typeof logoData === 'object') {
            return logoData.url || logoData.publicURL || logoData.secure_url || logoData.downloadURL || null;
        }

        return null;
    };

    const handleLogout = () => {
        // Clear session storage
        sessionStorage.removeItem('businessData');
        // Redirect to login
        navigate('/business-login');
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Render placeholder content for different tabs
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="dashboard-content">
                        <div className="welcome-section">
                            <div className="welcome-header">
                                <h1>Welcome back, {businessData.businessName}!</h1>
                                <p>Here's what's happening with your business today.</p>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <Star size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <h3>Reviews</h3>
                                        <div className="stat-value">{dashboardStats?.reviews || 0}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <Clock size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <h3>Pending Bookings</h3>
                                        <div className="stat-value">{dashboardStats?.pendingBookings || 0}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <h3>Total Orders</h3>
                                        <div className="stat-value">{dashboardStats?.totalOrders || 0}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <IndianRupee size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <h3>Revenue (₹)</h3>
                                        <div className="stat-value">
                                            {dashboardStats?.totalRevenue ?
                                                `${dashboardStats.totalRevenue.toLocaleString()}` :
                                                '0'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="recent-activity">
                                <h3>Recent Activity</h3>
                                <div className="activity-list">
                                    <div className="activity-item">
                                        <div className="activity-icon">
                                            <ShoppingBag size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <p>New order received</p>
                                            <span className="activity-time">2 hours ago</span>
                                        </div>
                                    </div>
                                    <div className="activity-item">
                                        <div className="activity-icon">
                                            <Star size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <p>New review from customer</p>
                                            <span className="activity-time">4 hours ago</span>
                                        </div>
                                    </div>
                                    <div className="activity-item">
                                        <div className="activity-icon">
                                            <Clock size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <p>Booking confirmed</p>
                                            <span className="activity-time">1 day ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'products':
                return <ProductManagement />;
            case 'services':
                return <ServiceManagement />;
            case 'bookings':
                return <EnhancedBookingManagement />;
            case 'orders':
                return <OrdersManagement />;
            case 'messages':
                return <BusinessMessages />;
            case 'settings':
                return <SettingsManagement />;
            default:
                return (
                    <div className="dashboard-content">
                        <h2>Dashboard Content</h2>
                        <p>Select a tab from the sidebar to view content.</p>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="business-dashboard-theme">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    Loading dashboard data...
                </div>
            </div>
        );
    }

    return (
        <div className="business-dashboard-theme">
            <div className="dashboard-container">
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h3>UdhyogUnity</h3>
                        <p className="business-type">{businessData.businessType || "Business Dashboard"}</p>
                    </div>

                    <nav className="sidebar-nav">
                        <ul>
                            <li className={activeTab === 'home' ? 'active' : ''}>
                                <button onClick={() => handleTabChange('home')}>
                                    <Home size={20} />
                                    <span>Home</span>
                                </button>
                            </li>
                            {/* Show Products tab if businessType is Product */}
                            {businessData.businessType === 'Product' && (
                                <li className={activeTab === 'products' ? 'active' : ''}>
                                    <button onClick={() => handleTabChange('products')}>
                                        <Package size={20} />
                                        <span>Products</span>
                                    </button>
                                </li>
                            )}
                            {businessData.businessType === 'Product' && (
                                <li className={activeTab === 'orders' ? 'active' : ''}>
                                    <button onClick={() => handleTabChange('orders')}>
                                        <List size={20} />
                                        <span>Orders</span>
                                    </button>
                                </li>
                            )}
                            {/* Show Services tab if businessType is Service */}
                            {businessData.businessType === 'Service' && (
                                <li className={activeTab === 'services' ? 'active' : ''}>
                                    <button onClick={() => handleTabChange('services')}>
                                        <Calendar size={20} />
                                        <span>Services</span>
                                    </button>
                                </li>
                            )}
                            {businessData.businessType === 'Service' && (
                                <li className={activeTab === 'bookings' ? 'active' : ''}>
                                    <button onClick={() => handleTabChange('bookings')}>
                                        <Clock size={20} />
                                        <span>Bookings</span>
                                    </button>
                                </li>
                            )}
                            <li className={activeTab === 'messages' ? 'active' : ''}>
                                <button onClick={() => handleTabChange('messages')}>
                                    <MessageSquare size={20} />
                                    <span>Messages</span>
                                </button>
                            </li>
                            <li className={activeTab === 'settings' ? 'active' : ''}>
                                <button onClick={() => handleTabChange('settings')}>
                                    <Settings size={20} />
                                    <span>Settings</span>
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="sidebar-footer">
                        <button className="user-logout-button" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Log</span>
                        </button>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <header className="dashboard-header">
                        <div className="header-content">
                            <h2>{businessData.businessName}</h2>
                            <div className="header-menu">
                                <div className="business-avatar">
                                    {(() => {
                                        const logoUrl = businessData.logo ? extractLogoUrl(businessData.logo) : null;

                                        if (logoUrl) {
                                            return (
                                                <img
                                                    src={logoUrl}
                                                    alt={`${businessData.businessName} logo`}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                    }}
                                                    className="business-logo"
                                                    onError={(e) => {
                                                        e.target.src = "https://www.adaptivewfs.com/wp-content/uploads/2020/07/logo-placeholder-image.png";
                                                    }}
                                                />
                                            );
                                        } else {
                                            return businessData.businessName?.charAt(0) || 'B';
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="main-content">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default BusinessDashboard;
