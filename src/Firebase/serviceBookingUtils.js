// src/Firebase/serviceBookingUtils.js
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    limit,
    getDoc,
    doc
} from "firebase/firestore";
import { db } from "./config";
import { getServiceById } from "./serviceDb";
import { getBusinessSchedule } from "./scheduleDb";
import { getBookingsByDateRange } from "./bookingDb";

/**
 * Get popular services for a business based on booking count
 * @param {string} businessId - The business ID
 * @param {number} count - Number of services to return
 * @returns {Array} Array of service objects with booking counts
 */
export const getPopularServices = async (businessId, count = 5) => {
    try {
        if (!businessId) {
            throw new Error("Business ID is required");
        }

        // Get all bookings for the business
        const bookingsQuery = query(
            collection(db, "bookings"),
            where("businessId", "==", businessId),
            where("status", "in", ["confirmed", "completed"])
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => doc.data());

        // Count bookings by service
        const serviceCounts = {};

        bookings.forEach(booking => {
            if (booking.serviceId) {
                serviceCounts[booking.serviceId] = (serviceCounts[booking.serviceId] || 0) + 1;
            }
        });

        // Get service details for the most booked services
        const popularServiceIds = Object.keys(serviceCounts)
            .sort((a, b) => serviceCounts[b] - serviceCounts[a])
            .slice(0, count);

        const servicesPromises = popularServiceIds.map(async (serviceId) => {
            const service = await getServiceById(serviceId);
            return {
                ...service,
                bookingCount: serviceCounts[serviceId]
            };
        });

        const popularServices = await Promise.all(servicesPromises);
        return popularServices;
    } catch (error) {
        console.error("Error getting popular services:", error);
        throw error;
    }
};

/**
 * Get recommended time slots for a service based on popularity and availability
 * @param {string} businessId - The business ID
 * @param {string} serviceId - The service ID
 * @param {Date} startDate - Start date for recommendation period
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Array of recommended time slots
 */
export const getRecommendedTimeSlots = async (businessId, serviceId, startDate = new Date(), days = 7) => {
    try {
        if (!businessId || !serviceId) {
            throw new Error("Business ID and Service ID are required");
        }

        // Get service details
        const service = await getServiceById(serviceId);
        const serviceDuration = service.duration || 60; // Default to 60 minutes

        // Get business schedule
        const schedule = await getBusinessSchedule(businessId);

        // Calculate end date
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days);

        // Initialize result array
        const recommendedSlots = [];

        // Loop through each day in the range
        for (let day = new Date(startDate); day < endDate; day.setDate(day.getDate() + 1)) {
            const currentDate = new Date(day);

            // Skip if it's a holiday
            const dateString = currentDate.toISOString().split('T')[0];
            const isHoliday = schedule.holidays.some(h => h.date === dateString);

            if (isHoliday) {
                continue;
            }

            // Check if it's a business day
            const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            const daySchedule = schedule.businessHours[dayOfWeek];

            if (!daySchedule || !daySchedule.isOpen) {
                continue;
            }

            // Check if it has special hours
            const specialHour = schedule.specialHours.find(sh => sh.date === dateString);
            const workingHours = specialHour || daySchedule;

            // Get bookings for this day
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            const bookings = await getBookingsByDateRange(businessId, dayStart, dayEnd);

            // Parse business hours
            const [startHours, startMinutes] = workingHours.start.split(':').map(Number);
            const [endHours, endMinutes] = workingHours.end.split(':').map(Number);

            const startTime = new Date(currentDate);
            startTime.setHours(startHours, startMinutes, 0, 0);

            const endTime = new Date(currentDate);
            endTime.setHours(endHours, endMinutes, 0, 0);

            // Generate slots based on service duration
            const slotDuration = schedule.slotDuration || 30; // minutes

            for (let time = new Date(startTime); time < endTime; time.setMinutes(time.getMinutes() + slotDuration)) {
                const slotEnd = new Date(time.getTime() + serviceDuration * 60000);

                // Skip if the slot would go past closing time
                if (slotEnd > endTime) {
                    continue;
                }

                // Check for conflicts with existing bookings
                const conflictingBookings = bookings.filter(booking => {
                    const bookingStart = booking.dateTime.toDate();
                    const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);

                    // Check if there's any overlap
                    return (
                        (time >= bookingStart && time < bookingEnd) ||
                        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                        (time <= bookingStart && slotEnd >= bookingEnd)
                    );
                });

                // Count bookings at this exact time
                const exactTimeBookings = bookings.filter(booking => {
                    return booking.dateTime.toDate().getTime() === time.getTime();
                });

                // Check against booking limits
                const maxBookingsPerSlot = schedule.maxBookingsPerSlot || 2;

                if (conflictingBookings.length === 0 || exactTimeBookings.length < maxBookingsPerSlot) {
                    recommendedSlots.push({
                        date: new Date(time),
                        dateString: dateString,
                        timeString: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isPopular: isPeakTime(time),
                        remainingSlots: maxBookingsPerSlot - exactTimeBookings.length
                    });

                    // Only add a few slots per day to the recommendation
                    if (recommendedSlots.filter(slot => slot.dateString === dateString).length >= 3) {
                        break;
                    }
                }
            }
        }

        return recommendedSlots.slice(0, 10); // Return top 10 recommended slots
    } catch (error) {
        console.error("Error getting recommended time slots:", error);
        throw error;
    }
};

/**
 * Helper function to determine if a time is typically popular (peak hours)
 * @param {Date} time - The time to check
 * @returns {boolean} Whether the time is typically popular
 */
const isPeakTime = (time) => {
    const hour = time.getHours();
    const dayOfWeek = time.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekday peak hours: lunch time (12-2pm) and after work (5-7pm)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return (hour >= 12 && hour < 14) || (hour >= 17 && hour < 19);
    }

    // Weekend peak hours: mid-morning to afternoon (10am-3pm)
    return hour >= 10 && hour < 15;
};

/**
 * Get upcoming services for a customer
 * @param {string} customerId - The customer ID
 * @param {number} limit - Maximum number of bookings to return
 * @returns {Array} Array of upcoming service bookings with service details
 */
export const getUpcomingCustomerServices = async (customerId, maxResults = 5) => {
    try {
        if (!customerId) {
            throw new Error("Customer ID is required");
        }

        const now = Timestamp.fromDate(new Date());

        // Get upcoming bookings for this customer
        const bookingsQuery = query(
            collection(db, "bookings"),
            where("customerId", "==", customerId),
            where("dateTime", ">=", now),
            where("status", "in", ["pending", "confirmed"]),
            orderBy("dateTime", "asc"),
            limit(maxResults)
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Fetch service details for each booking
        const bookingsWithServices = await Promise.all(bookings.map(async (booking) => {
            if (!booking.serviceId) {
                return booking;
            }

            try {
                const service = await getServiceById(booking.serviceId);
                return {
                    ...booking,
                    service
                };
            } catch (error) {
                console.error(`Error fetching service ${booking.serviceId}:`, error);
                return {
                    ...booking,
                    service: { name: "Unknown Service" }
                };
            }
        }));

        return bookingsWithServices;
    } catch (error) {
        console.error("Error getting upcoming customer services:", error);
        throw error;
    }
};
