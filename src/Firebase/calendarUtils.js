// src/Firebase/calendarUtils.js
import { getBookingsByDateRange } from './bookingDb';
import { getBusinessSchedule } from './scheduleDb';
import { getServiceById } from './serviceDb';

/**
 * Generate a monthly calendar with availability status for each day
 * @param {string} businessId - The business ID
 * @param {Date} month - The month to generate the calendar for (Date object)
 * @returns {Array} - Array of day objects with date and availability status
 */
export const generateMonthlyCalendar = async (businessId, month) => {
    try {
        if (!businessId || !month) {
            throw new Error("Business ID and month are required");
        }

        // Get business schedule
        const schedule = await getBusinessSchedule(businessId);

        // Get first and last day of the month
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        // Get all bookings for the month
        // Note: keep calculations local without unused variables

        const bookings = await getBookingsByDateRange(businessId, firstDay, lastDay);

        // Initialize calendar days
        const calendarDays = [];

        // Loop through each day of the month
        for (let day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
            const currentDate = new Date(day);
            const dateString = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

            // Check if it's a business day
            const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
            const daySchedule = schedule.businessHours[dayOfWeek];

            // Check if it's a holiday
            const isHoliday = schedule.holidays.some(h => h.date === dateString);

            // Check if it has special hours
            const specialHour = schedule.specialHours.find(sh => sh.date === dateString);

            // Check bookings for this day
            const dayBookings = bookings.filter(booking => {
                const bookingDate = booking.dateTime.toDate();
                return bookingDate.getDate() === currentDate.getDate() &&
                    bookingDate.getMonth() === currentDate.getMonth() &&
                    bookingDate.getFullYear() === currentDate.getFullYear();
            });

            // Calculate availability status
            let availabilityStatus;
            if (isHoliday) {
                availabilityStatus = 'closed';
            } else if (!daySchedule || !daySchedule.isOpen) {
                availabilityStatus = 'closed';
            } else if (specialHour && !specialHour.isOpen) {
                availabilityStatus = 'closed';
            } else {
                // Check if fully booked
                const maxBookingsPerDay = schedule.maxBookingsPerDay || 20;

                if (dayBookings.length >= maxBookingsPerDay) {
                    availabilityStatus = 'full';
                } else if (dayBookings.length > (maxBookingsPerDay * 0.7)) {
                    availabilityStatus = 'limited';
                } else {
                    availabilityStatus = 'available';
                }
            }

            calendarDays.push({
                date: new Date(currentDate),
                dateString: dateString,
                availabilityStatus,
                bookingsCount: dayBookings.length,
                isBusinessDay: daySchedule?.isOpen && !isHoliday,
                hasSpecialHours: !!specialHour
            });
        }

        return calendarDays;
    } catch (error) {
        console.error("Error generating monthly calendar:", error);
        throw error;
    }
};

/**
 * Check if a specific timeslot is available
 * @param {string} businessId - The business ID
 * @param {string} serviceId - The service ID
 * @param {Date} dateTime - The date and time to check
 * @returns {boolean} - Whether the timeslot is available
 */
export const checkTimeslotAvailability = async (businessId, serviceId, dateTime) => {
    try {
        if (!businessId || !serviceId || !dateTime) {
            throw new Error("Business ID, Service ID, and date/time are required");
        }

        // Get business schedule
        const schedule = await getBusinessSchedule(businessId);

        // Get service details to know duration
        const service = await getServiceById(serviceId);
        const serviceDuration = service.duration || 60; // Default to 60 minutes

        // Convert the date to required formats
        const date = new Date(dateTime);
        const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Check if it's a holiday
        const isHoliday = schedule.holidays.some(h => h.date === dateString);
        if (isHoliday) {
            return false; // Closed for holiday
        }

        // Check if it's a business day
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const daySchedule = schedule.businessHours[dayOfWeek];

        if (!daySchedule || !daySchedule.isOpen) {
            return false; // Closed on this day of week
        }

        // Check if it has special hours
        const specialHour = schedule.specialHours.find(sh => sh.date === dateString);
        const workingHours = specialHour || daySchedule;

        // Check if the time is within business hours
        const timeString = date.toTimeString().split(' ')[0].substring(0, 5); // Format: HH:MM

        if (timeString < workingHours.start || timeString >= workingHours.end) {
            return false; // Outside business hours
        }

        // Get bookings for the day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await getBookingsByDateRange(businessId, startOfDay, endOfDay);

        // Calculate end time of the requested service
        const serviceEndTime = new Date(date.getTime() + serviceDuration * 60000);

        // Check for conflicts with existing bookings
        const conflictingBookings = bookings.filter(booking => {
            const bookingStart = booking.dateTime.toDate();
            const bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);

            // Check if there's any overlap
            return (
                (date >= bookingStart && date < bookingEnd) ||
                (serviceEndTime > bookingStart && serviceEndTime <= bookingEnd) ||
                (date <= bookingStart && serviceEndTime >= bookingEnd)
            );
        });

        // Check for bookings at the same exact time
        const exactTimeBookings = bookings.filter(booking => {
            return booking.dateTime.toDate().getTime() === date.getTime();
        });

        // Check against booking limits
        const maxBookingsPerSlot = schedule.maxBookingsPerSlot || 2;

        return conflictingBookings.length === 0 || exactTimeBookings.length < maxBookingsPerSlot;
    } catch (error) {
        console.error("Error checking timeslot availability:", error);
        throw error;
    }
};

/**
 * Get statistics for bookings over a given period
 * @param {string} businessId - The business ID
 * @param {string} period - The period to get statistics for ('day', 'week', 'month')
 * @returns {Object} - Statistics object with counts by status
 */
export const getBookingStatistics = async (businessId, period = 'week') => {
    try {
        if (!businessId) {
            throw new Error("Business ID is required");
        }

        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7); // Default to week
        }

        // Get all bookings within the date range
        const bookings = await getBookingsByDateRange(businessId, startDate, endDate);

        // Initialize statistics object
        const statistics = {
            total: bookings.length,
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            rescheduled: 0
        };

        // Count bookings by status
        bookings.forEach(booking => {
            if (Object.prototype.hasOwnProperty.call(statistics, booking.status)) {
                statistics[booking.status]++;
            }
        });

        return statistics;
    } catch (error) {
        console.error("Error getting booking statistics:", error);
        throw error;
    }
};
