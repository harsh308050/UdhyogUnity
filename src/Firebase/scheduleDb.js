// src/Firebase/scheduleDb.js
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firebase Collection Structure:
 * 
 * businessSchedules Collection
 * └── businessId (document ID)
 *     └── {
 *           businessHours, specialHours, holidays,
 *           maxBookingsPerDay, maxBookingsPerSlot,
 *           slotDuration, advanceBookingDays
 *         } (document fields)
 */

// Default business hours
export const DEFAULT_BUSINESS_HOURS = {
    monday: { start: '09:00', end: '18:00', isOpen: true },
    tuesday: { start: '09:00', end: '18:00', isOpen: true },
    wednesday: { start: '09:00', end: '18:00', isOpen: true },
    thursday: { start: '09:00', end: '18:00', isOpen: true },
    friday: { start: '09:00', end: '18:00', isOpen: true },
    saturday: { start: '10:00', end: '16:00', isOpen: true },
    sunday: { start: '10:00', end: '14:00', isOpen: false }
};

// Default schedule settings
export const DEFAULT_SCHEDULE_SETTINGS = {
    businessHours: DEFAULT_BUSINESS_HOURS,
    specialHours: [],
    holidays: [],
    maxBookingsPerDay: 20,
    maxBookingsPerSlot: 2,
    slotDuration: 30, // minutes
    advanceBookingDays: 30
};

// Set or update business schedule
export const setBusinessSchedule = async (businessId, scheduleData) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);

        // Merge with default settings if needed
        const mergedSchedule = {
            ...DEFAULT_SCHEDULE_SETTINGS,
            ...scheduleData,
            updatedAt: Timestamp.now()
        };

        await setDoc(scheduleRef, mergedSchedule, { merge: true });

        return {
            businessId,
            ...mergedSchedule
        };
    } catch (error) {
        console.error("Error setting business schedule:", error);
        throw error;
    }
};

// Get business schedule
export const getBusinessSchedule = async (businessId) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);
        const scheduleDoc = await getDoc(scheduleRef);

        if (!scheduleDoc.exists()) {
            // Return default schedule if none exists
            return {
                businessId,
                ...DEFAULT_SCHEDULE_SETTINGS,
                exists: false
            };
        }

        return {
            businessId,
            ...scheduleDoc.data(),
            exists: true
        };
    } catch (error) {
        console.error("Error getting business schedule:", error);
        throw error;
    }
};

// Add a special hour exception (like holiday or modified hours)
export const addSpecialHours = async (businessId, specialHour) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);
        const scheduleDoc = await getDoc(scheduleRef);

        let specialHours = [];

        if (scheduleDoc.exists()) {
            specialHours = scheduleDoc.data().specialHours || [];
        }

        // Add the new special hour
        specialHours.push({
            ...specialHour,
            id: Date.now().toString() // Simple ID generation
        });

        // Update the schedule
        await setDoc(scheduleRef, {
            specialHours,
            updatedAt: Timestamp.now()
        }, { merge: true });

        return specialHours;
    } catch (error) {
        console.error("Error adding special hours:", error);
        throw error;
    }
};

// Remove a special hour exception
export const removeSpecialHours = async (businessId, specialHourId) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);
        const scheduleDoc = await getDoc(scheduleRef);

        if (!scheduleDoc.exists()) {
            throw new Error("Business schedule not found");
        }

        const specialHours = scheduleDoc.data().specialHours || [];

        // Remove the special hour
        const updatedSpecialHours = specialHours.filter(hour => hour.id !== specialHourId);

        // Update the schedule
        await updateDoc(scheduleRef, {
            specialHours: updatedSpecialHours,
            updatedAt: Timestamp.now()
        });

        return updatedSpecialHours;
    } catch (error) {
        console.error("Error removing special hours:", error);
        throw error;
    }
};

// Add a holiday
export const addHoliday = async (businessId, holiday) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);
        const scheduleDoc = await getDoc(scheduleRef);

        let holidays = [];

        if (scheduleDoc.exists()) {
            holidays = scheduleDoc.data().holidays || [];
        }

        // Add the new holiday
        holidays.push({
            ...holiday,
            id: Date.now().toString() // Simple ID generation
        });

        // Update the schedule
        await setDoc(scheduleRef, {
            holidays,
            updatedAt: Timestamp.now()
        }, { merge: true });

        return holidays;
    } catch (error) {
        console.error("Error adding holiday:", error);
        throw error;
    }
};

// Remove a holiday
export const removeHoliday = async (businessId, holidayId) => {
    try {
        const scheduleRef = doc(db, "businessSchedules", businessId);
        const scheduleDoc = await getDoc(scheduleRef);

        if (!scheduleDoc.exists()) {
            throw new Error("Business schedule not found");
        }

        const holidays = scheduleDoc.data().holidays || [];

        // Remove the holiday
        const updatedHolidays = holidays.filter(holiday => holiday.id !== holidayId);

        // Update the schedule
        await updateDoc(scheduleRef, {
            holidays: updatedHolidays,
            updatedAt: Timestamp.now()
        });

        return updatedHolidays;
    } catch (error) {
        console.error("Error removing holiday:", error);
        throw error;
    }
};

// Generate available time slots for a specific date
export const generateAvailableTimeSlots = async (businessId, date, serviceId) => {
    try {
        // Get business schedule
        const schedule = await getBusinessSchedule(businessId);

        // Get service details to know duration
        const serviceRef = doc(db, "services", serviceId);
        const serviceDoc = await getDoc(serviceRef);

        if (!serviceDoc.exists()) {
            throw new Error("Service not found");
        }

        const serviceDuration = serviceDoc.data().duration || 60; // Default to 60 minutes

        // Get day of week from the date
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });

        // Check if it's a regular business day
        const daySchedule = schedule.businessHours[dayOfWeek];

        if (!daySchedule || !daySchedule.isOpen) {
            return []; // Closed on this day
        }

        // Check if it's a holiday or has special hours
        const dateString = new Date(date).toISOString().split('T')[0]; // Format: YYYY-MM-DD

        const holiday = schedule.holidays.find(h => h.date === dateString);
        if (holiday) {
            return []; // Closed for holiday
        }

        const specialHour = schedule.specialHours.find(sh => sh.date === dateString);
        const workingHours = specialHour || daySchedule;

        // Generate time slots based on working hours and slot duration
        const slots = [];
        const slotDuration = schedule.slotDuration || 30; // Default 30 minutes

        const startTime = new Date(`${dateString}T${workingHours.start}`);
        const endTime = new Date(`${dateString}T${workingHours.end}`);

        // Get existing bookings for this date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await getBookingsByDateRange(
            businessId,
            startOfDay,
            endOfDay
        );

        // Generate all possible time slots
        let currentSlot = new Date(startTime);

        while (currentSlot < endTime) {
            const slotEnd = new Date(currentSlot.getTime() + (serviceDuration * 60000));

            // Skip if the slot would go past closing time
            if (slotEnd > endTime) {
                break;
            }

            // Check if the slot is available (not booked or within maxBookingsPerSlot)
            const conflictingBookings = bookings.filter(booking => {
                const bookingStart = booking.dateTime.toDate();
                const bookingEnd = new Date(bookingStart.getTime() + (booking.duration * 60000));

                // Check if there's any overlap
                return (
                    (currentSlot >= bookingStart && currentSlot < bookingEnd) ||
                    (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                    (currentSlot <= bookingStart && slotEnd >= bookingEnd)
                );
            });

            // Count bookings at this exact time
            const exactTimeBookings = bookings.filter(booking => {
                return booking.dateTime.toDate().getTime() === currentSlot.getTime();
            });

            // Add slot if available
            if (conflictingBookings.length === 0 ||
                exactTimeBookings.length < schedule.maxBookingsPerSlot) {
                slots.push({
                    time: currentSlot.toISOString(),
                    available: true
                });
            }

            // Move to next slot
            currentSlot = new Date(currentSlot.getTime() + (slotDuration * 60000));
        }

        return slots;
    } catch (error) {
        console.error("Error generating available time slots:", error);
        throw error;
    }
};

// Helper function to get bookings by date range
const getBookingsByDateRange = async (businessId, startDate, endDate) => {
    try {
        // Convert dates to Timestamps
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const q = query(
            collection(db, "bookings"),
            where("businessId", "==", businessId),
            where("dateTime", ">=", startTimestamp),
            where("dateTime", "<=", endTimestamp),
            where("status", "in", ["pending", "confirmed"]) // Only consider active bookings
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
