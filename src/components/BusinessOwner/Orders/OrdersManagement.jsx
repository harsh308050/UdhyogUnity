import React, { useEffect, useState } from 'react';
import {
  CheckCircle, Clock, Package, XCircle, RefreshCw, AlertCircle,
  ChevronDown, ChevronUp, Truck, ShoppingBag, CreditCard, Calendar, User
} from 'lucide-react';
import { getBusinessOrders, updateOrderStatus, cancelOrder } from '../../../Firebase/ordersDb';
import { runOrdersMigration } from '../../../Firebase/migrateOrders';
import './Orders.css';

const statusBadge = (status) => {
  const cls = `status-badge ${status.replace(/\s+/g, '-').toLowerCase()}`;
  let icon;

  switch (status) {
    case 'Paid':
      icon = <CreditCard size={14} />;
      break;
    case 'Confirmed':
      icon = <CheckCircle size={14} />;
      break;
    case 'Ready for Pickup':
      icon = <Package size={14} />;
      break;
    case 'Picked Up':
      icon = <Truck size={14} />;
      break;
    case 'Completed':
      icon = <CheckCircle size={14} />;
      break;
    case 'Cancelled':
      icon = <XCircle size={14} />;
      break;
    default:
      icon = <Clock size={14} />;
  }

  return (
    <span className={cls}>
      {icon}
      <span>{status || 'Pending'}</span>
    </span>
  );
};

const OrdersManagement = ({ businessData }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const load = async () => {
    if (!businessData?.email) return;
    setLoading(true);
    try {
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

      const data = await getBusinessOrders(businessData.email);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  useEffect(() => { load(); }, [businessData?.email]);

  const setStatus = async (orderId, status) => {
    setUpdating(orderId + status);
    try {
      await updateOrderStatus(orderId, status);
      await load();
    } finally {
      setUpdating('');
    }
  };

  const cancel = async (orderId) => {
    setUpdating(orderId + 'cancel');
    try {
      await cancelOrder(orderId, "Cancelled by business");
      await load();
    } finally {
      setUpdating('');
    }
  };

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
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
      return 'Date Error';
    }
  };

  // Filter orders based on active filter
  const filteredOrders = orders.filter(order => {
    if (!order) return false;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (order.id && order.id.toLowerCase().includes(searchLower)) ||
        (order.productName && order.productName.toLowerCase().includes(searchLower)) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
        (order.customerEmail && order.customerEmail.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Apply status filter
    const status = order.status || 'Pending';

    if (activeFilter === 'all') {
      return true;
    } else if (activeFilter === 'active') {
      return !['Picked Up', 'Completed', 'Cancelled'].includes(status);
    } else if (activeFilter === 'ready') {
      return status === 'Ready for Pickup';
    } else if (activeFilter === 'completed') {
      return status === 'Picked Up' || status === 'Completed';
    } else if (activeFilter === 'cancelled') {
      return status === 'Cancelled';
    }
    return true;
  }).sort((a, b) => {
    // Apply sorting
    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();

    if (sortOrder === 'newest') {
      return dateB - dateA; // Newest first
    } else {
      return dateA - dateB; // Oldest first
    }
  });

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    active: orders.filter(o => o && !['Picked Up', 'Completed', 'Cancelled'].includes(o.status || 'Pending')).length,
    ready: orders.filter(o => o && o.status === 'Ready for Pickup').length,
    completed: orders.filter(o => o && (o.status === 'Picked Up' || o.status === 'Completed')).length,
    cancelled: orders.filter(o => o && o.status === 'Cancelled').length
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2>Orders</h2>
        <div className="header-actions">
          <button className="btn btn-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="orders-controls">
        <div className="filter-tabs">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
            {orderCounts.all > 0 && <span className="count-badge">{orderCounts.all}</span>}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Active
            {orderCounts.active > 0 && <span className="count-badge">{orderCounts.active}</span>}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ready')}
          >
            Ready for Pickup
            {orderCounts.ready > 0 && <span className="count-badge">{orderCounts.ready}</span>}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            Completed
            {orderCounts.completed > 0 && <span className="count-badge">{orderCounts.completed}</span>}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveFilter('cancelled')}
          >
            Cancelled
            {orderCounts.cancelled > 0 && <span className="count-badge">{orderCounts.cancelled}</span>}
          </button>
        </div>

        <div className="search-sort-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="sort-container">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <Package size={48} />
          <h3>No {activeFilter !== 'all' ? activeFilter : ''} orders found</h3>
          {searchTerm ? (
            <p>No orders match your search. Try different keywords or clear your search.</p>
          ) : (
            <p>New customer orders will appear here.</p>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div className={`order-card ${expandedOrder === order.id ? 'expanded' : ''}`} key={order.id}>
              <div className="order-summary" onClick={() => toggleOrderDetails(order.id)}>
                <div className="order-primary-info">
                  <div className="order-id">
                    <ShoppingBag size={16} />
                    <span className="id-text">{order.id}</span>
                  </div>
                  <div className="order-product">
                    <strong>{order.productName}</strong>
                    <span className="quantity">Qty: {order.quantity}</span>
                  </div>
                </div>

                <div className="order-secondary-info">
                  <div className="customer-info">
                    <User size={16} />
                    <span>{order.customerName || 'Customer'}</span>
                  </div>

                  <div className="payment-info">
                    <CreditCard size={16} />
                    <span>{order.paymentMethod === 'online' ? 'Paid Online' : 'Cash on Pickup'}</span>
                  </div>

                  <div className="pickup-info">
                    <Calendar size={16} />
                    <span>{formatDate(order.pickupDateTime)}</span>
                  </div>

                  <div className="status-container">
                    {statusBadge(order.status)}
                  </div>

                  <button className="expand-btn">
                    {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="order-details">
                  <div className="details-grid">
                    <div className="details-section">
                      <h4>Order Information</h4>
                      <p><strong>Order ID:</strong> {order.id}</p>
                      <p><strong>Created:</strong> {formatDate(order.createdAt)}</p>
                      <p><strong>Last Updated:</strong> {formatDate(order.updatedAt)}</p>
                      <p><strong>Product:</strong> {order.productName}</p>
                      <p><strong>Quantity:</strong> {order.quantity}</p>
                      <p><strong>Total Amount:</strong> ₹{(Number(order.totalAmount) || 0).toFixed(2)}</p>
                    </div>

                    <div className="details-section">
                      <h4>Customer Details</h4>
                      <p><strong>Name:</strong> {order.customerName}</p>
                      <p><strong>Email:</strong> {order.customerEmail}</p>
                      <p><strong>Phone:</strong> {order.customerPhone || 'N/A'}</p>
                    </div>

                    <div className="details-section">
                      <h4>Payment Information</h4>
                      <p><strong>Method:</strong> {order.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Pickup'}</p>
                      <p><strong>Status:</strong> <span className={order.paymentStatus === 'paid' ? 'status-pending' : 'status-paid'}>{order.paymentStatus}</span></p>
                      {order.paymentMethod === 'online' && order.paymentDetails && (
                        <p><strong>Transaction ID:</strong> {order.paymentDetails.paymentId || 'N/A'}</p>
                      )}
                      <p><strong>Pickup Date:</strong> {formatDate(order.pickupDateTime)}</p>
                    </div>
                  </div>

                  <div className="order-actions">
                    <div className="status-update-buttons">

                      <button
                        className="action-btn ready-btn"
                        disabled={updating || order.status === 'Ready for Pickup'}
                        onClick={() => setStatus(order.id, 'Ready for Pickup')}
                      >
                        <Package size={16} />
                        <span>Ready for Pickup</span>
                      </button>

                      <button
                        className="action-btn completed-btn"
                        disabled={updating || ['Completed', 'Picked Up'].includes(order.status)}
                        onClick={() => setStatus(order.id, 'Completed')}
                      >
                        <CheckCircle size={16} />
                        <span>Mark Completed</span>
                      </button>
                    </div>

                    {!['Cancelled', 'Completed',].includes(order.status) && (
                      <button
                        className="action-btn cancel-btn"
                        disabled={updating}
                        onClick={() => cancel(order.id)}
                      >
                        <XCircle size={16} />
                        <span>Cancel Order</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
