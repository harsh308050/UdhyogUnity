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
  setDoc,
} from 'firebase/firestore';
import { db } from './config';

// Collection Structure:
// Orders
//   └── orderId (document)
//         └─ [Order data fields]
//
// Customers
//   └── customerEmail (document)
//         └── Orders (subcollection)
//               └── orderId (same data as main Orders doc)
//
// Businesses
//   └── businessEmail (document)
//         └── Orders (subcollection)
//               └── orderId (same data as main Orders doc)

const ORDERS_COLLECTION = 'Orders';
const CUSTOMERS_COLLECTION = 'Customers';
const BUSINESSES_COLLECTION = 'Businesses';
const ORDERS_SUBCOLLECTION = 'Orders';

export const createOrder = async (order) => {
  try {
    const now = Timestamp.now();
    const newOrder = {
      ...order,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Add to main Orders collection
    const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), newOrder);
    const orderId = orderRef.id;
    const orderWithId = { id: orderId, ...newOrder };

    // 2. Add to customer's Orders subcollection
    if (order.customerEmail) {
      const customerOrderRef = doc(
        db,
        CUSTOMERS_COLLECTION,
        order.customerEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await setDoc(customerOrderRef, orderWithId);
    }

    // 3. Add to business's Orders subcollection
    if (order.businessEmail) {
      const businessOrderRef = doc(
        db,
        BUSINESSES_COLLECTION,
        order.businessEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await setDoc(businessOrderRef, orderWithId);
    }

    return orderWithId;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const getOrderById = async (orderId) => {
  try {
    const ref = doc(db, ORDERS_COLLECTION, orderId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("Error getting order by ID:", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  try {
    const orderDoc = await getOrderById(orderId);
    if (!orderDoc) throw new Error("Order not found");

    const updateData = {
      status,
      updatedAt: Timestamp.now(),
      ...extra
    };

    // 1. Update in main Orders collection
    const mainOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(mainOrderRef, updateData);

    // 2. Update in customer's Orders subcollection
    if (orderDoc.customerEmail) {
      const customerOrderRef = doc(
        db,
        CUSTOMERS_COLLECTION,
        orderDoc.customerEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(customerOrderRef, updateData);
    }

    // 3. Update in business's Orders subcollection
    if (orderDoc.businessEmail) {
      const businessOrderRef = doc(
        db,
        BUSINESSES_COLLECTION,
        orderDoc.businessEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(businessOrderRef, updateData);
    }

    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const updatePaymentStatus = async (orderId, paymentStatus, paymentDetails = {}) => {
  try {
    const orderDoc = await getOrderById(orderId);
    if (!orderDoc) throw new Error("Order not found");

    const updateData = {
      paymentStatus,
      paymentDetails,
      updatedAt: Timestamp.now(),
    };

    // 1. Update in main Orders collection
    const mainOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(mainOrderRef, updateData);

    // 2. Update in customer's Orders subcollection
    if (orderDoc.customerEmail) {
      const customerOrderRef = doc(
        db,
        CUSTOMERS_COLLECTION,
        orderDoc.customerEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(customerOrderRef, updateData);
    }

    // 3. Update in business's Orders subcollection
    if (orderDoc.businessEmail) {
      const businessOrderRef = doc(
        db,
        BUSINESSES_COLLECTION,
        orderDoc.businessEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(businessOrderRef, updateData);
    }

    return true;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

export const getBusinessOrders = async (businessEmail, limitCount = 100) => {
  try {
    // Use the business's Orders subcollection for faster retrieval
    const ordersRef = collection(db, BUSINESSES_COLLECTION, businessEmail, ORDERS_SUBCOLLECTION);
    const snap = await getDocs(ordersRef);

    // Sort orders in memory by creation date (newest first)
    const orders = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return dateB - dateA; // descending order
    }).slice(0, limitCount);

    return orders;
  } catch (error) {
    console.error("Error fetching business orders:", error);

    // Fallback to main Orders collection if subcollection doesn't exist yet
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('businessEmail', '==', businessEmail)
      );
      const snap = await getDocs(q);

      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return dateB - dateA; // descending order
        })
        .slice(0, limitCount);
    } catch (fallbackError) {
      console.error("Fallback error fetching business orders:", fallbackError);
      return []; // Return empty array if both attempts fail
    }
  }
};

export const getCustomerOrders = async (customerEmail, limitCount = 100) => {
  try {
    // Use the customer's Orders subcollection for faster retrieval
    const ordersRef = collection(db, CUSTOMERS_COLLECTION, customerEmail, ORDERS_SUBCOLLECTION);
    const snap = await getDocs(ordersRef);

    // Sort orders in memory by creation date (newest first)
    const orders = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      return dateB - dateA; // descending order
    }).slice(0, limitCount);

    return orders;
  } catch (error) {
    console.error("Error fetching customer orders from subcollection:", error);

    // Fallback to main Orders collection if subcollection doesn't exist yet
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION),
        where('customerEmail', '==', customerEmail)
      );
      const snap = await getDocs(q);

      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return dateB - dateA; // descending order
        })
        .slice(0, limitCount);
    } catch (fallbackError) {
      console.error("Fallback error fetching customer orders:", fallbackError);
      return []; // Return empty array if both attempts fail
    }
  }
};

export const cancelOrder = async (orderId, reason = '') => {
  try {
    const orderDoc = await getOrderById(orderId);
    if (!orderDoc) throw new Error("Order not found");

    const updateData = {
      status: 'Cancelled',
      updatedAt: Timestamp.now(),
      cancellationReason: reason,
    };

    // 1. Update in main Orders collection
    const mainOrderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(mainOrderRef, updateData);

    // 2. Update in customer's Orders subcollection
    if (orderDoc.customerEmail) {
      const customerOrderRef = doc(
        db,
        CUSTOMERS_COLLECTION,
        orderDoc.customerEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(customerOrderRef, updateData);
    }

    // 3. Update in business's Orders subcollection
    if (orderDoc.businessEmail) {
      const businessOrderRef = doc(
        db,
        BUSINESSES_COLLECTION,
        orderDoc.businessEmail,
        ORDERS_SUBCOLLECTION,
        orderId
      );
      await updateDoc(businessOrderRef, updateData);
    }

    return true;
  } catch (error) {
    console.error("Error cancelling order:", error);
    throw error;
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const orderDoc = await getOrderById(orderId);
    if (!orderDoc) throw new Error("Order not found");

    // 1. Delete from main Orders collection
    await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));

    // 2. Delete from customer's Orders subcollection
    if (orderDoc.customerEmail) {
      await deleteDoc(
        doc(db, CUSTOMERS_COLLECTION, orderDoc.customerEmail, ORDERS_SUBCOLLECTION, orderId)
      );
    }

    // 3. Delete from business's Orders subcollection
    if (orderDoc.businessEmail) {
      await deleteDoc(
        doc(db, BUSINESSES_COLLECTION, orderDoc.businessEmail, ORDERS_SUBCOLLECTION, orderId)
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
};

// Function to migrate existing orders to the new structure
export const migrateExistingOrders = async () => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const snap = await getDocs(ordersRef);

    for (const orderDoc of snap.docs) {
      const order = { id: orderDoc.id, ...orderDoc.data() };

      // Add to customer's Orders subcollection
      if (order.customerEmail) {
        const customerOrderRef = doc(
          db,
          CUSTOMERS_COLLECTION,
          order.customerEmail,
          ORDERS_SUBCOLLECTION,
          order.id
        );
        await setDoc(customerOrderRef, order);
      }

      // Add to business's Orders subcollection
      if (order.businessEmail) {
        const businessOrderRef = doc(
          db,
          BUSINESSES_COLLECTION,
          order.businessEmail,
          ORDERS_SUBCOLLECTION,
          order.id
        );
        await setDoc(businessOrderRef, order);
      }
    }

    return true;
  } catch (error) {
    console.error("Error migrating existing orders:", error);
    throw error;
  }
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
  migrateExistingOrders,
};
