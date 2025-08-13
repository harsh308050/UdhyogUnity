// src/Firebase/ordersDb.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';

// Collection: Orders
// Document fields (example):
// {
//   productId, productName, productImage, productPrice, quantity, totalAmount,
//   businessEmail, businessId, businessName,
//   customerEmail, customerName,
//   paymentMethod: 'online' | 'cash',
//   paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded',
//   paymentDetails: { provider: 'razorpay', paymentId, orderId, signature },
//   pickupDateTime: Timestamp,
//   status: 'Paid' | 'Pending' | 'Confirmed' | 'Ready for Pickup' | 'Picked Up' | 'Cancelled',
//   createdAt: Timestamp, updatedAt: Timestamp
// }

const ORDERS_COLLECTION = 'Orders';

export const createOrder = async (order) => {
  const now = Timestamp.now();
  const newOrder = {
    ...order,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, ORDERS_COLLECTION), newOrder);
  return { id: ref.id, ...newOrder };
};

export const getOrderById = async (orderId) => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, { status, updatedAt: Timestamp.now(), ...extra });
  return true;
};

export const updatePaymentStatus = async (orderId, paymentStatus, paymentDetails = {}) => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, {
    paymentStatus,
    paymentDetails,
    updatedAt: Timestamp.now(),
  });
  return true;
};

export const getBusinessOrders = async (businessEmail, limitCount = 100) => {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('businessEmail', '==', businessEmail),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, limitCount);
};

export const getCustomerOrders = async (customerEmail, limitCount = 100) => {
  try {
    // First attempt with just the where clause without ordering
    // This will work even without a composite index
    const simpleQuery = query(
      collection(db, ORDERS_COLLECTION),
      where('customerEmail', '==', customerEmail)
    );

    const snap = await getDocs(simpleQuery);

    // Sort the results in memory to avoid requiring the composite index
    const orders = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Sort by createdAt in descending order
    return orders
      .sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return dateB - dateA; // descending order
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return []; // Return empty array on error
  }
};

export const cancelOrder = async (orderId, reason = '') => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, {
    status: 'Cancelled',
    updatedAt: Timestamp.now(),
    cancellationReason: reason,
  });
  return true;
};

export const deleteOrder = async (orderId) => {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
  return true;
};

export default {
  createOrder,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  getBusinessOrders,
  getCustomerOrders,
  cancelOrder,
  deleteOrder,
};
