// src/Firebase/bookingDb.js
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firebase Collection Structure:
 * 
 * bookings Collection
 * └── bookingId (document ID)
 *     └── {
 *           serviceId, businessId, customerId, customerName,
 *           customerPhone, customerEmail, dateTime, status,
 *           notes, createdAt, updatedAt, duration, serviceName,
 *           price, location
 *         } (document fields)
 * 
 * businessSchedules Collection
 * └── businessId (document ID)
 *     └── {
 *           businessHours, specialHours, holidays,
 *           maxBookingsPerDay, maxBookingsPerSlot,
 *           slotDuration, advanceBookingDays
 *         } (document fields)
 */

// Add a new booking
export const addBooking = async (bookingData) => {
    try {
        // Prepare booking data for Firestore
        const newBooking = {
            ...bookingData,
            status: 'pending', // Default status
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // If dateTime is a string, convert to Timestamp
        if (typeof newBooking.dateTime === 'string') {
            newBooking.dateTime = Timestamp.fromDate(new Date(newBooking.dateTime));
        }

        // Add booking to Firestore
        const docRef = await addDoc(collection(db, "bookings"), newBooking);

        return {
            id: docRef.id,
            ...newBooking
        };
    } catch (error) {
        console.error("Error adding booking:", error);
        throw error;
    }
};

// Update a booking status
export const updateBookingStatus = async (bookingId, status) => {
    try {
        const bookingRef = doc(db, "bookings", bookingId);

        await updateDoc(bookingRef, {
            status,
            updatedAt: Timestamp.now()
        });

        return true;
    } catch (error) {
        console.error("Error updating booking status:", error);
        throw error;
    }
};

// Update booking details
export const updateBooking = async (bookingId, bookingData) => {
    try {
        const bookingRef = doc(db, "bookings", bookingId);

        // Prepare updated booking data
        const updatedBooking = {
            ...bookingData,
            updatedAt: Timestamp.now()
        };

        // If dateTime is a string, convert to Timestamp
        if (typeof updatedBooking.dateTime === 'string') {
            updatedBooking.dateTime = Timestamp.fromDate(new Date(updatedBooking.dateTime));
        }

        await updateDoc(bookingRef, updatedBooking);

        return true;
    } catch (error) {
        console.error("Error updating booking:", error);
        throw error;
    }
};

// Delete a booking
export const deleteBooking = async (bookingId) => {
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await deleteDoc(bookingRef);
        return true;
    } catch (error) {
        console.error("Error deleting booking:", error);
        throw error;
    }
};

// Get all bookings for a business
export const getBusinessBookings = async (businessId) => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("businessId", "==", businessId),
            orderBy("dateTime", "desc")
        );

        const querySnapshot = await getDocs(q);
        const bookings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return bookings;
    } catch (error) {
        console.error("Error getting business bookings:", error);
        throw error;
    }
};

// Get bookings for a specific service
export const getServiceBookings = async (serviceId) => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("serviceId", "==", serviceId),
            orderBy("dateTime", "desc")
        );

        const querySnapshot = await getDocs(q);
        const bookings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return bookings;
    } catch (error) {
        console.error("Error getting service bookings:", error);
        throw error;
    }
};

// Get bookings for a specific customer
export const getCustomerBookings = async (customerId) => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("customerId", "==", customerId),
            orderBy("dateTime", "desc")
        );

        const querySnapshot = await getDocs(q);
        const bookings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return bookings;
    } catch (error) {
        console.error("Error getting customer bookings:", error);
        throw error;
    }
};

// Get a single booking by ID
export const getBookingById = async (bookingId) => {
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingDoc = await getDoc(bookingRef);

        if (!bookingDoc.exists()) {
            throw new Error("Booking not found");
        }

        return {
            id: bookingDoc.id,
            ...bookingDoc.data()
        };
    } catch (error) {
        console.error("Error getting booking:", error);
        throw error;
    }
};

// Get bookings for a specific date range
export const getBookingsByDateRange = async (businessId, startDate, endDate) => {
    try {
        // Convert dates to Timestamps
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        const endTimestamp = Timestamp.fromDate(new Date(endDate));

        const q = query(
            collection(db, "bookings"),
            where("businessId", "==", businessId),
            where("dateTime", ">=", startTimestamp),
            where("dateTime", "<=", endTimestamp),
            orderBy("dateTime", "asc")
        );

        const querySnapshot = await getDocs(q);
        const bookings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return bookings;
    } catch (error) {
        console.error("Error getting bookings by date range:", error);
        throw error;
    }
};
