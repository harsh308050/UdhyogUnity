import React, { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronUp, ShoppingBag, Clock, Check, X } from 'react-feather';
import { getCustomerOrders } from '../../Firebase/ordersDb';
import { useAuth } from '../../context/AuthContext';
import './UserOrders.css';

function UserOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                if (!currentUser?.email) {
                    setLoading(false);
                    return;
                }

                console.log("Fetching orders for user:", currentUser.email);

                // Add a small delay to ensure database is ready (helpful in development)
                if (process.env.NODE_ENV === 'development') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                const fetchedOrders = await getCustomerOrders(currentUser.email);
                console.log("Orders fetched:", fetchedOrders);

                // Check if orders array is valid
                if (Array.isArray(fetchedOrders)) {
                    setOrders(fetchedOrders);
                } else {
                    console.error("Invalid orders data:", fetchedOrders);
                    setOrders([]);
                }

                setLoading(false);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setError("Failed to load your orders. Please try again.");
                setOrders([]); // Ensure we have an empty array
                setLoading(false);
            }
        };

        fetchOrders();

        // Set up a refresh interval for development environment
        let refreshInterval;
        if (process.env.NODE_ENV === 'development') {
            refreshInterval = setInterval(() => {
                fetchOrders();
            }, 10000); // Refresh every 10 seconds in dev mode
        }

        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [currentUser]);

    const toggleOrderDetails = (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
        } else {
            setExpandedOrder(orderId);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';

        try {
            let date;
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                // Handle Firestore Timestamp
                date = timestamp.toDate();
            } else if (timestamp.seconds) {
                // Handle Firestore Timestamp that might be serialized
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp instanceof Date) {
                // Handle JavaScript Date
                date = timestamp;
            } else {
                // Try to parse as string or number
                date = new Date(timestamp);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn("Invalid date:", timestamp);
                return 'Invalid Date';
            }

            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error("Error formatting date:", error, timestamp);
            return 'Date Error';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Paid':
                return <Clock className="status-icon paid" />;
            case 'Confirmed':
                return <Check className="status-icon confirmed" />;
            case 'Ready for Pickup':
                return <Package className="status-icon ready" />;
            case 'Picked Up':
                return <Check className="status-icon completed" />;
            case 'Cancelled':
                return <X className="status-icon cancelled" />;
            default:
                return <Clock className="status-icon pending" />;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Paid': return 'status-paid';
            case 'Confirmed': return 'status-confirmed';
            case 'Ready for Pickup': return 'status-ready';
            case 'Picked Up': return 'status-completed';
            case 'Cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    };

    const filteredOrders = activeFilter === 'all'
        ? orders
        : orders.filter(order => {
            if (!order) return false;

            const status = order.status || 'Pending';

            if (activeFilter === 'active') {
                return !['Picked Up', 'Cancelled'].includes(status);
            } else if (activeFilter === 'completed') {
                return status === 'Picked Up';
            } else if (activeFilter === 'cancelled') {
                return status === 'Cancelled';
            }
            return true;
        });

    if (loading) {
        return (
            <div className="user-orders-container">
                <div className="loading-spinner"></div>
                <p>Loading your orders...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-orders-container">
                <div className="error-message">
                    <p>{error}</p>
                    <button className="refresh-button" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="user-orders-container">
            <div className="user-orders-header">
                <h1><ShoppingBag size={24} /> My Orders</h1>
                <div className="user-orders-filters">
                    <button
                        className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('active')}
                    >
                        Active
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('completed')}
                    >
                        Completed
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('cancelled')}
                    >
                        Cancelled
                    </button>
                </div>
            </div>

            {/* Debug info for troubleshooting */}
            {filteredOrders.length === 0 ? (
                <div className="empty-orders">
                    <Package size={48} />
                    <h3>No orders found</h3>
                    <p>You don't have any {activeFilter !== 'all' ? activeFilter : ''} orders yet.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="order-card">
                            <div className="order-summary" onClick={() => toggleOrderDetails(order.id)}>
                                <div className="order-product-info">
                                    {order.productImage ? (
                                        <img
                                            src={order.productImage}
                                            alt={order.productName}
                                            className="product-thumbnail"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '../../assets/empty-box.svg';
                                            }}
                                        />
                                    ) : (
                                        <div className="product-thumbnail-placeholder">
                                            <Package size={20} />
                                        </div>
                                    )}
                                    <div className="order-info">
                                        <h3>{order.productName}</h3>
                                        <p className="business-name">from {order.businessName}</p>
                                    </div>
                                </div>
                                <div className="order-meta">
                                    <div className={`order-status ${getStatusClass(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        <span>{order.status}</span>
                                    </div>
                                    <p className="order-date">Ordered on {formatDate(order.createdAt)}</p>
                                    <button className="expand-btn">
                                        {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="order-details">
                                    <div className="order-details-grid">
                                        <div className="detail-column">
                                            <div className="detail-group">
                                                <h4>Order Details</h4>
                                                <p><strong>Order ID:</strong> {order.id}</p>
                                                <p><strong>Quantity:</strong> {order.quantity}</p>
                                                <p><strong>Total Amount:</strong> ₹{(Number(order.totalAmount) || 0).toFixed(2)}</p>
                                                <p><strong>Ordered At:</strong> {formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="detail-column">
                                            <div className="detail-group">
                                                <h4>Payment Information</h4>
                                                <p><strong>Payment Method:</strong> {order.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Pickup'}</p>
                                                <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
                                                {order.paymentMethod === 'online' && order.paymentDetails && (
                                                    <p><strong>Transaction ID:</strong> {order.paymentDetails.paymentId || 'N/A'}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="detail-column">
                                            <div className="detail-group">
                                                <h4>Pickup Information</h4>
                                                <p><strong>Pickup Time:</strong> {formatDate(order.pickupDateTime)}</p>
                                                <p><strong>Business:</strong> {order.businessName}</p>
                                                {order.status === 'Cancelled' && order.cancellationReason && (
                                                    <div className="cancellation-reason">
                                                        <p><strong>Cancellation Reason:</strong></p>
                                                        <p>{order.cancellationReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions section for active orders */}
                                    {!['Picked Up', 'Cancelled'].includes(order.status) && (
                                        <div className="order-actions">
                                            <p>Need help with this order? Contact the business directly.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UserOrders;
