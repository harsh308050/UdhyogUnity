import React, { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronUp, ShoppingBag, Clock, Check, X } from 'react-feather';
import { getCustomerOrders } from '../../Firebase/ordersDb';
import { runOrdersMigration } from '../../Firebase/migrateOrders';
import { useAuth } from '../../context/AuthContext';
import { addReview, hasUserReviewed } from '../../Firebase/reviewDb_new';
import ReviewForm from '../miniComponents/ReviewForm';
import './UserOrders.css';

function UserOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [reviewableOrders, setReviewableOrders] = useState({});
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

                // Run migration if not already done
                // This will move existing orders to the nested collection structure
                const migrationNeeded = localStorage.getItem('ordersMigrationDone') !== 'true';
                if (migrationNeeded) {
                    try {
                        console.log("Running orders migration...");
                        await runOrdersMigration();
                        localStorage.setItem('ordersMigrationDone', 'true');
                        console.log("Orders migration completed successfully");
                    } catch (migrationError) {
                        console.error("Migration error:", migrationError);
                        // Continue with fetching orders even if migration fails
                    }
                }

                const fetchedOrders = await getCustomerOrders(currentUser.email);
                console.log("Orders fetched:", fetchedOrders);

                // Check if orders array is valid
                if (Array.isArray(fetchedOrders)) {
                    setOrders(fetchedOrders);

                    // Check which completed orders can be reviewed
                    const reviewableStatus = {};

                    if (fetchedOrders && fetchedOrders.length > 0) {
                        const completedOrders = fetchedOrders.filter(order =>
                            order.status === 'Completed' || order.status === 'Delivered'
                        );

                        for (const order of completedOrders) {
                            try {
                                // Check if user has already reviewed this product
                                const hasReviewed = await hasUserReviewed(
                                    currentUser.email,
                                    'product',
                                    order.productId
                                );

                                reviewableStatus[order.id] = !hasReviewed;
                            } catch (error) {
                                console.error("Error checking review status:", error);
                                reviewableStatus[order.id] = true; // Assume reviewable on error
                            }
                        }
                    }

                    setReviewableOrders(reviewableStatus);
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
            case 'Completed':
                return <Check className="status-icon completed" />;
            case 'Cancelled':
                return <X className="status-icon cancelled" />;
            default:
                return <Clock className="status-icon pending" />;
        }
    };

    const getStatusDescription = (status) => {
        switch (status) {
            case 'Paid':
                return 'Your order has been paid for and is being processed.';
            case 'Confirmed':
                return 'Your order has been confirmed by the business.';
            case 'Ready for Pickup':
                return 'Your order is ready for pickup at the business location.';
            case 'Picked Up':
                return 'You have picked up your order.';
            case 'Completed':
                return 'Your order has been completed.';
            case 'Cancelled':
                return 'This order has been cancelled.';
            default:
                return 'Your order is pending processing.';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Paid': return 'status-paid';
            case 'Confirmed': return 'status-confirmed';
            case 'Ready for Pickup': return 'status-ready';
            case 'Picked Up': return 'status-completed';
            case 'Completed': return 'status-completed';
            case 'Cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    };

    const handleOpenReviewForm = (order) => {
        setSelectedOrder(order);
        setShowReviewForm(true);
    };

    const handleSubmitReview = async (reviewData) => {
        if (!currentUser || !selectedOrder) return;

        try {
            console.log('Submitting review for product:', {
                type: 'product',
                businessId: selectedOrder.businessId,
                productId: selectedOrder.productId,
                userId: currentUser.uid
            });

            // The addReview function expects separate parameters, not an object
            await addReview(
                'product',
                (selectedOrder.businessEmail || selectedOrder.businessId),
                selectedOrder.productId,
                currentUser.uid,
                currentUser.displayName || 'Anonymous User',
                reviewData.rating,
                reviewData.comment,
                currentUser.photoURL || '',
                selectedOrder.id
            );

            // Update the reviewable status for this order
            setReviewableOrders({
                ...reviewableOrders,
                [selectedOrder.id]: false
            });

            return true;
        } catch (error) {
            console.error("Error submitting review:", error);
            if (error.message && error.message.includes('No document to update')) {
                throw new Error("Unable to update product. The product may have been removed or moved to a different collection.");
            } else if (error.message && error.message.includes('not found for business')) {
                throw new Error("This product no longer exists in the system and cannot be reviewed.");
            } else {
                throw new Error(`Failed to submit review: ${error.message || "Unknown error occurred"}`);
            }
        }
    };

    const handleCloseReviewForm = () => {
        setShowReviewForm(false);
        setSelectedOrder(null);
    };

    const filterCounts = {
        all: orders.length,
        active: orders.filter(order => order && !['Picked Up', 'Completed', 'Cancelled'].includes(order.status)).length,
        completed: orders.filter(order => order && (order.status === 'Picked Up' || order.status === 'Completed')).length,
        cancelled: orders.filter(order => order && order.status === 'Cancelled').length
    };

    const filteredOrders = activeFilter === 'all'
        ? orders
        : orders.filter(order => {
            if (!order) return false;

            const status = order.status || 'Pending';

            if (activeFilter === 'active') {
                // Active orders: Orders that are not completed or cancelled
                return !['Picked Up', 'Completed', 'Cancelled'].includes(status);
            } else if (activeFilter === 'completed') {
                // Completed orders: Orders that are picked up or explicitly marked as completed
                return status === 'Picked Up' || status === 'Completed';
            } else if (activeFilter === 'cancelled') {
                // Cancelled orders
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
                        {filterCounts.all > 0 && <span className="filter-count">{filterCounts.all}</span>}
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('active')}
                    >
                        Active
                        {filterCounts.active > 0 && <span className="filter-count">{filterCounts.active}</span>}
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('completed')}
                    >
                        Completed
                        {filterCounts.completed > 0 && <span className="filter-count">{filterCounts.completed}</span>}
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('cancelled')}
                    >
                        Cancelled
                        {filterCounts.cancelled > 0 && <span className="filter-count">{filterCounts.cancelled}</span>}
                    </button>
                </div>
            </div>

            {/* Debug info for troubleshooting */}
            {filteredOrders.length === 0 ? (
                <div className="empty-orders">
                    <Package size={48} />
                    <h3>No {activeFilter !== 'all' ? activeFilter : ''} orders found</h3>
                    {activeFilter === 'all' && (
                        <p>You haven't placed any orders yet. Start by exploring products from local businesses!</p>
                    )}
                    {activeFilter === 'active' && (
                        <p>You don't have any active orders at the moment. Check the 'Completed' tab to see your order history.</p>
                    )}
                    {activeFilter === 'completed' && (
                        <p>You don't have any completed orders yet. Orders will appear here once they're picked up or marked as completed.</p>
                    )}
                    {activeFilter === 'cancelled' && (
                        <p>You don't have any cancelled orders. That's good news!</p>
                    )}
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
                                        <span>{order.status || 'Pending'}</span>
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
                                                <p className={`status-description ${getStatusClass(order.status)}`}>
                                                    <strong>Status:</strong> {getStatusDescription(order.status)}
                                                </p>
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
                                    {!['Picked Up', 'Completed', 'Cancelled'].includes(order.status) && (
                                        <div className="order-actions">
                                            <p>Need help with this order? Contact the business directly.</p>
                                        </div>
                                    )}
                                    {(order.status === 'Picked Up' || order.status === 'Completed') && (
                                        <div className="order-actions completed-actions">
                                            <p>This order has been completed. Thank you for your purchase!</p>
                                            {reviewableOrders[order.id] && (
                                                <button
                                                    className="btn-review"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenReviewForm(order);
                                                    }}
                                                >
                                                    Leave a Review
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showReviewForm && selectedOrder && (
                <div className="modal-overlay">
                    <ReviewForm
                        entityName={selectedOrder.productName}
                        entityType="product"
                        onSubmit={handleSubmitReview}
                        onCancel={handleCloseReviewForm}
                    />
                </div>
            )}
        </div>
    );
}

export default UserOrders;
