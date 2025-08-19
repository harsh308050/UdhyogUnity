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
import { IndianRupee } from 'lucide-react';

function BusinessDashboard() {
    const [businessData, setBusinessData] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const navigate = useNavigate();

    useEffect(() => {
        // Get business data from session storage or fetch from Firestore
        const loadData = async () => {
            try {
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
                    // If there's no logo in the data, add a test logo for demo purposes
                    if (!businessData.logo) {
                        console.log("No logo found in business data, adding test logo");
                        businessData.logo = {
                            folder: "UdhyogUnity/FUELPART/Profile",
                            full_path: "UdhyogUnity/FUELPART/Profile/logo.png",
                            original_name: "blob",
                            public_id: "UdhyogUnity/FUELPART/Profile/logo.png",
                            url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfg_GBpz0w-D4j10cAuw0W_oDR7dQMcZ6l4UDBn1L6HEuAYOxBIr6yHkTCKxW5QDTUUrg&usqp=CAU"
                        };
                    }

                    console.log("Final business data with logo:", businessData);
                    setBusinessData(businessData);
                } else {
                    // No data found anywhere, use demo data
                    console.log("No business data found, using demo data");
                    setDemoData();
                }
            } catch (err) {
                console.error("Error loading business data:", err);
                setDemoData();
            }
        };

        loadData();
    }, []);

    // Set demo data for development or when no session data exists
    const setDemoData = () => {
        const demoData = {
            businessId: "demo-business-id",
            businessName: "Demo Profile",
            email: "demo@example.com",
            isVerified: true,
            businessType: "Service", // Can be "Product" or "Service"
            productCount: 5,
            pendingReservations: 7,
            paymentsReceived: 12500,
            averageRating: 4.6,
            // Mock logo data structure as it would be in Firestore (Cloudinary format)
            logo: {
                folder: "UdhyogUnity/FUELPART/Profile",
                full_path: "UdhyogUnity/FUELPART/Profile/logo.png",
                original_name: "blob",
                public_id: "UdhyogUnity/FUELPART/Profile/logo.png",
                url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfg_GBpz0w-D4j10cAuw0W_oDR7dQMcZ6l4UDBn1L6HEuAYOxBIr6yHkTCKxW5QDTUUrg&usqp=CAU"
            }
        };

        console.log("Setting demo data:", demoData);
        setBusinessData(demoData);
    };

    // Helper function to extract logo URL from various formats
    const extractLogoUrl = (logoData) => {
        console.log("Extracting URL from logo data:", JSON.stringify(logoData, null, 2));

        if (!logoData) {
            console.log("No logo data, returning placeholder");
            return null; // Will use first letter fallback
        }

        // If logoData is an array, use the first item's url
        if (Array.isArray(logoData)) {
            console.log("Logo data is an array, using first item:", JSON.stringify(logoData[0], null, 2));
            return logoData[0]?.url || null;
        }

        // If logoData is a Cloudinary object with url property (most common case)
        if (typeof logoData === 'object' && logoData.url) {
            console.log("Logo data is an object with URL property:", logoData.url);
            const url = logoData.url;

            // For Cloudinary URLs, ensure they use HTTPS
            if (url && url.includes('cloudinary.com') && url.startsWith('http:')) {
                return url.replace('http:', 'https:');
            }

            return url;
        }

        // If logoData is somehow just a string URL already
        if (typeof logoData === 'string') {
            console.log("Logo data is a string URL:", logoData);
            return logoData;
        }

        // Default fallback
        console.log("Using default placeholder for logo");
        return null;
    };

    const handleLogout = () => {
        // Clear session storage
        sessionStorage.removeItem('businessData');
        // Redirect to login
        navigate('/business-login');
    };

    // Render placeholder content for different tabs
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <div className="dashboard-content">
                        <h1 className="welcome-header">Welcome back, {businessData?.businessName} 👋</h1>

                        {/* Dashboard Overview Cards */}
                        <div className="dashboard-overview">
                            <div className="overview-card">
                                <div className="card-icon">
                                    <Shield size={32} />
                                </div>
                                <div className="card-info">
                                    <h3>Business Status</h3>
                                    {businessData?.isVerified ?
                                        <span className="verification-badge verified">✓ Verified</span> :
                                        <span className="verification-badge pending">⏳ Pending</span>
                                    }
                                </div>
                            </div>

                            {businessData?.businessType === 'Product' ? (
                                <div className="overview-card">
                                    <div className="card-icon products-icon">
                                        <Package size={32} />
                                    </div>
                                    <div className="card-info">
                                        <div className="card-label">Total Products Listed</div>
                                        <div className="card-value">{businessData?.productCount || 0}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="overview-card">
                                    <div className="card-icon orders-icon">
                                        <ShoppingBag size={32} />
                                    </div>
                                    <div className="card-info">
                                        <div className="card-label">Total Services Listed</div>
                                        <div className="card-value">{businessData?.serviceCount || 0}</div>
                                    </div>
                                </div>
                            )}

                            {businessData?.businessType === 'Service' && (
                                <div className="overview-card">
                                    <div className="card-icon revenue-icon">
                                        <Clock size={32} />
                                    </div>
                                    <div className="card-info">
                                        <div className="card-label">Pending Reservations</div>
                                        <div className="card-value">{businessData?.pendingReservations || 0}</div>
                                    </div>
                                </div>
                            )}

                            <div className="overview-card">
                                <div className="card-icon customers-icon">
                                    <IndianRupee size={32} />
                                </div>
                                <div className="card-info">
                                    <div className="card-label">Payments Received</div>
                                    <div className="card-value">₹{businessData?.paymentsReceived?.toLocaleString() || 0}</div>
                                </div>
                            </div>

                            <div className="overview-card">
                                <div className="card-icon products-icon">
                                    <Star size={32} />
                                </div>
                                <div className="card-info">
                                    <div className="card-label">Average Review Rating</div>
                                    <div className="card-value">{businessData?.averageRating || 0} / 5</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'products':
                return (
                    <div className="dashboard-content">
                        <ProductManagement businessData={businessData} />
                    </div>
                );
            case 'orders':
                return (
                    <div className="dashboard-content">
                        <OrdersManagement businessData={businessData} />
                    </div>
                );
            case 'services':
                return (
                    <div className="dashboard-content">
                        <ServiceManagement businessData={businessData} />
                    </div>
                );
            case 'reservations':
                return (
                    <div className="dashboard-content">
                        <EnhancedBookingManagement businessData={businessData} />
                    </div>
                );
            case 'messages':
                return (
                    <div className="dashboard-content">
                        <BusinessMessages businessData={businessData} />
                    </div>
                );
            case 'settings':
                return (
                    <div className="dashboard-content">
                        <SettingsManagement businessData={businessData} />
                    </div>
                );
            default:
                return <div>Select a tab to view content</div>;
        }
    };

    if (!businessData) {
        return <div className="loading">Loading...</div>;
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
                                <button onClick={() => setActiveTab('home')}>
                                    <Home size={20} />
                                    <span>Home</span>
                                </button>
                            </li>
                            {/* Show Products tab if businessType is Product */}
                            {businessData.businessType === 'Product' && (
                                <li className={activeTab === 'products' ? 'active' : ''}>
                                    <button onClick={() => setActiveTab('products')}>
                                        <Package size={20} />
                                        <span>Products</span>
                                    </button>
                                </li>
                            )}
                            {businessData.businessType === 'Product' && (
                                <li className={activeTab === 'orders' ? 'active' : ''}>
                                    <button onClick={() => setActiveTab('orders')}>
                                        <List size={20} />
                                        <span>Orders</span>
                                    </button>
                                </li>
                            )}
                            {/* Show Services tab if businessType is Service */}
                            {businessData.businessType === 'Service' && (
                                <li className={activeTab === 'services' ? 'active' : ''}>
                                    <button onClick={() => setActiveTab('services')}>
                                        <ShoppingBag size={20} />
                                        <span>Services</span>
                                    </button>
                                </li>
                            )}
                            {/* Show Reservations tab only if businessType is Service */}
                            {businessData.businessType === 'Service' && (
                                <li className={activeTab === 'reservations' ? 'active' : ''}>
                                    <button onClick={() => setActiveTab('reservations')}>
                                        <Calendar size={20} />
                                        <span>Reservations</span>
                                    </button>
                                </li>
                            )}
                            <li className={activeTab === 'messages' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('messages')}>
                                    <MessageSquare size={20} />
                                    <span>Messages</span>
                                </button>
                            </li>
                            <li className={activeTab === 'settings' ? 'active' : ''}>
                                <button onClick={() => setActiveTab('settings')}>
                                    <Settings size={20} />
                                    <span>Settings</span>
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="sidebar-footer">
                        <button className="logout-button" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <header className="dashboard-header">
                        <div className="header-content">
                            <h5>{businessData.businessName}</h5>
                            <div className="user-menu">
                                <div className="business-avatar">
                                    {console.log("Rendering avatar with logoUrl:", businessData.logoUrl)}
                                    {businessData.logo ? (
                                        <img
                                            src={"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfg_GBpz0w-D4j10cAuw0W_oDR7dQMcZ6l4UDBn1L6HEuAYOxBIr6yHkTCKxW5QDTUUrg&usqp=CAU"}
                                            alt={`${businessData.businessName} logo`}
                                            className="business-logo"
                                            onError={(e) => {
                                                console.log("Logo image failed to load:", e);
                                                e.target.src = "https://www.adaptivewfs.com/wp-content/uploads/2020/07/logo-placeholder-image.png";
                                            }}
                                        />
                                    ) : (
                                        businessData.businessName?.charAt(0) || 'B'
                                    )}
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