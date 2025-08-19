// src/Firebase/serviceScheduleDb.js
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { DEFAULT_BUSINESS_HOURS } from "./scheduleDb";

/**                // Special handling for the specific format shown in the screenshot
        // The screenshot shows timeSlots as an array with objects that have start/end
        const dayAvailability = availability[dayOfWeek];
        let timeSlots = [];
        
        if (dayAvailability.timeSlots) {
            // Handle the nested timeSlots format from the screenshot
            if (Array.isArray(dayAvailability.timeSlots)) {
                // The timeSlots might be an array of objects with numeric keys
                const timeSlotEntries = Object.entries(dayAvailability.timeSlots);
                if (timeSlotEntries.length > 0) {
                    timeSlots = timeSlotEntries.map(([key, slot]) => {
                        if (typeof slot === 'object' && slot.start && slot.end) {
                            return { start: slot.start, end: slot.end };
                        }
                        return null;
                    }).filter(Boolean);
                }
                
                if (timeSlots.length === 0 && Array.isArray(dayAvailability.timeSlots)) {
                    // Try to use the array directly if it contains objects with start/end
                    timeSlots = dayAvailability.timeSlots
                        .filter(slot => typeof slot === 'object' && slot.start && slot.end)
                        .map(slot => ({ start: slot.start, end: slot.end }));
                }
            }
        }
        
        // If we still don't have timeSlots, try other formats
        if (timeSlots.length === 0) {
            if (typeof dayAvailability === 'object' && dayAvailability.isAvailable) {
                timeSlots = [{ start: dayAvailability.start || "09:00", end: dayAvailability.end || "18:00" }];
            }vice availability hours, which can be custom or inherited from business hours
 * @param {string} serviceId - The service ID
 * @param {string} businessId - The business ID
 * @returns {Promise<Object>} - The service availability hours
 */
export const getServiceAvailability = async (serviceId, businessId) => {
    try {
        // First check if the service has custom availability settings
        const servicesRef = collection(db, "Services");
        const businessServices = await getDocs(servicesRef);
        
        let serviceData = null;
        let businessEmail = null;
        
        // Find the business document that contains this service
        for (const businessDoc of businessServices.docs) {
            // Check Active subcollection
            const activeRef = collection(businessDoc.ref, "Active");
            const activeServiceQuery = query(activeRef, where("businessId", "==", businessId));
            const activeServices = await getDocs(activeServiceQuery);
            
            for (const service of activeServices.docs) {
                if (service.id === serviceId) {
                    serviceData = service.data();
                    businessEmail = businessDoc.id;
                    break;
                }
            }
            
            if (!serviceData) {
                // Check Inactive subcollection if not found in Active
                const inactiveRef = collection(businessDoc.ref, "Inactive");
                const inactiveServiceQuery = query(inactiveRef, where("businessId", "==", businessId));
                const inactiveServices = await getDocs(inactiveServiceQuery);
                
                for (const service of inactiveServices.docs) {
                    if (service.id === serviceId) {
                        serviceData = service.data();
                        businessEmail = businessDoc.id;
                        break;
                    }
                }
            }
            
            if (serviceData) break;
        }
        
        if (!serviceData) {
            throw new Error(`Service ${serviceId} not found for business ${businessId}`);
        }
        
        // If service has custom availability and it's enabled, return it
        if (serviceData.useCustomAvailability && serviceData.availability) {
            return {
                source: 'service',
                availability: serviceData.availability
            };
        }
        
        // Otherwise, use business hours
        const businessRef = doc(db, "Businesses", businessId);
        const businessDoc = await getDoc(businessRef);
        
        if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            
            // Return business hours, converting from the simple format to slots format if needed
            const businessHours = businessData.businessHours || DEFAULT_BUSINESS_HOURS;
            
            // Convert business hours to slots format if needed
            const formattedAvailability = {};
            
            Object.entries(businessHours).forEach(([day, hours]) => {
                formattedAvailability[day] = {
                    isAvailable: hours.isOpen,
                    timeSlots: hours.isOpen ? [{ start: hours.start, end: hours.end }] : []
                };
            });
            
            return {
                source: "business",
                availability: formattedAvailability
            };
        }
        
        // Fall back to default business hours
        const defaultFormattedAvailability = {};
        
        Object.entries(DEFAULT_BUSINESS_HOURS).forEach(([day, hours]) => {
            defaultFormattedAvailability[day] = {
                isAvailable: hours.isOpen,
                timeSlots: hours.isOpen ? [{ start: hours.start, end: hours.end }] : []
            };
        });
        
        return {
            source: "default",
            availability: defaultFormattedAvailability
        };
    } catch (error) {
        console.error("Error getting service availability:", error);
        throw error;
    }
};

/**
 * Generate available time slots for a service on a specific date
 * @param {string} serviceId - The service ID
 * @param {string} businessId - The business ID
 * @param {Date} date - The date to check
 * @returns {Promise<Array>} - Array of available time slots
 */
export const generateAvailableTimeSlots = async (serviceId, businessId, date) => {
    try {
        // Get service details to determine duration
        const servicesRef = collection(db, "Services");
        
        // Attempt to fetch service directly by ID from the business's services
        let serviceData = null;
        const serviceRef = doc(db, "Services", businessId, "Active", serviceId);
        const serviceDoc = await getDoc(serviceRef);
        
        if (serviceDoc.exists()) {
            serviceData = serviceDoc.data();
        } else {
            // Try inactive services if not found
            const inactiveServiceRef = doc(db, "Services", businessId, "Inactive", serviceId);
            const inactiveServiceDoc = await getDoc(inactiveServiceRef);
            
            if (inactiveServiceDoc.exists()) {
                serviceData = inactiveServiceDoc.data();
            } else {
                // If still not found, try the legacy path
                const legacyServiceRef = doc(db, "Services", businessId, "ActiveServices", serviceId);
                const legacyServiceDoc = await getDoc(legacyServiceRef);
                
                if (legacyServiceDoc.exists()) {
                    serviceData = legacyServiceDoc.data();
                }
            }
        }
        
        // If direct approach failed, try the collection scan method
        if (!serviceData) {
            try {
                const businessServices = await getDocs(servicesRef);
                
                // Find the service document
                for (const businessDoc of businessServices.docs) {
                    // Check Active subcollection
                    const activeRef = collection(businessDoc.ref, "Active");
                    const activeServiceQuery = query(activeRef);
                    const activeServices = await getDocs(activeServiceQuery);
                    
                    for (const service of activeServices.docs) {
                        if (service.id === serviceId) {
                            serviceData = service.data();
                            break;
                        }
                    }
                    
                    if (!serviceData) {
                        // Check Inactive subcollection if not found in Active
                        const inactiveRef = collection(businessDoc.ref, "Inactive");
                        const inactiveServiceQuery = query(inactiveRef);
                        const inactiveServices = await getDocs(inactiveServiceQuery);
                        
                        for (const service of inactiveServices.docs) {
                            if (service.id === serviceId) {
                                serviceData = service.data();
                                break;
                            }
                        }
                    }
                    
                    if (serviceData) break;
                }
            } catch (err) {
                console.warn("Collection scan method failed:", err);
            }
        }
        
        if (!serviceData) {
            console.error(`Service ${serviceId} not found for business ${businessId}`);
            return []; // Return empty array instead of throwing
        }
        
        const serviceDuration = parseInt(serviceData.duration) || 60; // Default 60 minutes
        
        // Get service availability - first check if it's in the service data directly
        let availability = null;
        
        if (serviceData.availability) {
            availability = serviceData.availability;
        } else {
            try {
                const availabilityData = await getServiceAvailability(serviceId, businessId);
                availability = availabilityData.availability;
            } catch (err) {
                console.warn("Could not get service availability:", err);
                
                // Fallback to default business hours
                availability = {};
                const defaultHours = DEFAULT_BUSINESS_HOURS;
                
                Object.entries(defaultHours).forEach(([day, hours]) => {
                    availability[day] = {
                        isAvailable: hours.isOpen,
                        timeSlots: hours.isOpen ? [{ start: hours.start, end: hours.end }] : []
                    };
                });
            }
        }
        
        // Get day of week from date
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // If no availability data or business is closed on that day, return empty array
        if (!availability || !availability[dayOfWeek] || !availability[dayOfWeek].isAvailable) {
            return [];
        }
        
        // Special handling for the specific format shown in the screenshot
        // The screenshot shows timeSlots as an array with objects that have start/end
        const dayAvailability = availability[dayOfWeek];
        let timeSlots = [];
        
        if (Array.isArray(dayAvailability.timeSlots) && dayAvailability.timeSlots.length > 0) {
            timeSlots = dayAvailability.timeSlots;
        } else if (typeof dayAvailability === 'object' && dayAvailability.isAvailable) {
            // Handle the case where the data is structured like the screenshot 
            // with timeSlots as an array with nested objects that have start/end
            timeSlots = [{ start: dayAvailability.start || "09:00", end: dayAvailability.end || "18:00" }];
        }
        
        if (timeSlots.length === 0) {
            return [];
        }
        
        // Try to get existing bookings, but don't fail if there's a query error
        let bookings = [];
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Use a simpler query to avoid the Firebase index error
            const bookingsQuery = query(
                collection(db, "bookings"),
                where("businessId", "==", businessId)
            );
            
            const bookingsSnapshot = await getDocs(bookingsQuery);
            bookings = bookingsSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().dateTime ? doc.data().dateTime.toDate() : new Date(doc.data().date)
                }))
                // Filter manually to avoid complex indexes
                .filter(booking => {
                    const bookingDate = booking.date;
                    return booking.serviceId === serviceId && 
                           bookingDate >= startOfDay && 
                           bookingDate <= endOfDay &&
                           (!booking.status || ["pending", "confirmed", "rescheduled"].includes(booking.status));
                })
                .map(booking => {
                    // Ensure the booking has start and end times
                    return {
                        ...booking,
                        startTime: booking.startTime || 
                            booking.date.toLocaleTimeString('en-US', {
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false
                            }),
                        endTime: booking.endTime || 
                            new Date(booking.date.getTime() + (booking.duration || 60) * 60000)
                                .toLocaleTimeString('en-US', {
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false
                                })
                    };
                });
        } catch (error) {
            console.warn("Error fetching bookings, proceeding with empty bookings list:", error);
        }
        
        // Generate available time slots based on service duration and existing bookings
        let availableSlots = [];
        
        for (const slot of timeSlots) {
            // Handle both the array and object formats from the screenshot
            let startStr = typeof slot === 'object' ? (slot.start || "09:00") : "09:00";
            let endStr = typeof slot === 'object' ? (slot.end || "18:00") : "18:00";
            
            const [startHour, startMinute] = startStr.split(':').map(Number);
            const [endHour, endMinute] = endStr.split(':').map(Number);
            
            const startTime = new Date(dateObj);
            startTime.setHours(startHour, startMinute, 0, 0);
            
            const endTime = new Date(dateObj);
            endTime.setHours(endHour, endMinute, 0, 0);
            
            // Calculate available slots in 15-minute increments
            const intervalMinutes = 30;
            
            let currentSlotStart = new Date(startTime);
            
            while (currentSlotStart.getTime() + serviceDuration * 60000 <= endTime.getTime()) {
                const slotStartTime = currentSlotStart.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                
                const slotEndTime = new Date(currentSlotStart.getTime() + serviceDuration * 60000)
                    .toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                
                // Check if this slot overlaps with any existing booking
                const isBooked = bookings.some(booking => {
                    const bookingStart = booking.startTime;
                    const bookingEnd = booking.endTime;
                    
                    // Convert booking times to Date objects for comparison
                    const bookingStartDate = new Date(dateObj);
                    const [bookingStartHour, bookingStartMinute] = bookingStart.split(':').map(Number);
                    bookingStartDate.setHours(bookingStartHour, bookingStartMinute, 0, 0);
                    
                    const bookingEndDate = new Date(dateObj);
                    const [bookingEndHour, bookingEndMinute] = bookingEnd.split(':').map(Number);
                    bookingEndDate.setHours(bookingEndHour, bookingEndMinute, 0, 0);
                    
                    // Check for any overlap
                    return (
                        (currentSlotStart <= bookingEndDate && 
                         new Date(currentSlotStart.getTime() + serviceDuration * 60000) >= bookingStartDate)
                    );
                });
                
                if (!isBooked) {
                    availableSlots.push({
                        start: slotStartTime,
                        end: slotEndTime,
                        available: true
                    });
                }
                
                // Move to next slot
                currentSlotStart.setMinutes(currentSlotStart.getMinutes() + intervalMinutes);
            }
        }
        
        return availableSlots;
    } catch (error) {
        console.error("Error generating available time slots:", error);
        return [];
    }
};
