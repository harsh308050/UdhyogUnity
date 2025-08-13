import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Package, XCircle, RefreshCw } from 'lucide-react';
import { getBusinessOrders, updateOrderStatus, cancelOrder } from '../../../Firebase/ordersDb';
import './Orders.css';

const statusBadge = (status) => {
  const cls = `status-badge ${status.replace(/\s+/g, '-').toLowerCase()}`;
  return <span className={cls}>{status}</span>;
};

const OrdersManagement = ({ businessData }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState('');

  const load = async () => {
    if (!businessData?.email) return;
    setLoading(true);
    try {
      const data = await getBusinessOrders(businessData.email);
      setOrders(data);
    } finally {
      setLoading(false);
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
      await cancelOrder(orderId);
      await load();
    } finally {
      setUpdating('');
    }
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
        <button className="btn btn-outline-secondary" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <Package size={48} />
          <h3>No orders yet</h3>
          <p>New customer orders will appear here.</p>
        </div>
      ) : (
        <div className="orders-table">
          <div className="table-row table-head">
            <div>Order ID</div>
            <div>Product</div>
            <div>Qty</div>
            <div>Customer</div>
            <div>Payment</div>
            <div>Pickup</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {orders.map((o) => (
            <div className="table-row" key={o.id}>
              <div className="mono">{o.id.slice(0, 8)}</div>
              <div>{o.productName}</div>
              <div>{o.quantity}</div>
              <div>
                <div className="mono small">{o.customerEmail}</div>
                <div className="small">{o.customerName}</div>
              </div>
              <div>
                <div className="small">{o.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Pickup'}</div>
                <div className={`small ${o.paymentStatus === 'paid' ? 'text-success' : 'text-warning'}`}>{o.paymentStatus}</div>
              </div>
              <div className="small">
                {o.pickupDateTime?.toDate ? o.pickupDateTime.toDate().toLocaleString() : ''}
              </div>
              <div>{statusBadge(o.status)}</div>
              <div className="actions">
                <button className="btn btn-sm" disabled={updating} onClick={() => setStatus(o.id, 'Confirmed')}>Confirm</button>
                <button className="btn btn-sm" disabled={updating} onClick={() => setStatus(o.id, 'Ready for Pickup')}>Ready</button>
                <button className="btn btn-sm" disabled={updating} onClick={() => setStatus(o.id, 'Picked Up')}>Picked Up</button>
                <button className="btn btn-sm btn-danger" disabled={updating} onClick={() => cancel(o.id)}>
                  <XCircle size={14} /> Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;
