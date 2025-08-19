import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, IndianRupee, Tag, User, Phone, Mail, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../Firebase/config';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './ServiceBookingModal.css';

const ServiceBookingModal = ({ service, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [businessData, setBusinessData] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [excludedTimes, setExcludedTimes] = useState([]);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);
    const [validationErrors, setValidationErrors] = useState({
        date: null,
        time: null,
        customerName: null,
        customerPhone: null,
        customerEmail: null
    });

    const [formData, setFormData] = useState({
        customerName: currentUser?.displayName || '',
        customerPhone: '',
        customerEmail: currentUser?.email || '',
        notes: ''
    });

    // Default business hours (example)
    const defaultBusinessHours = {
        monday: { start: '09:00', end: '18:00', isOpen: true },
        tuesday: { start: '09:00', end: '18:00', isOpen: true },
        wednesday: { start: '09:00', end: '18:00', isOpen: true },
        thursday: { start: '09:00', end: '18:00', isOpen: true },
        friday: { start: '09:00', end: '18:00', isOpen: true },
        saturday: { start: '10:00', end: '16:00', isOpen: true },
        sunday: { start: '10:00', end: '14:00', isOpen: false }
    };

    // Fetch business data when component mounts
    useEffect(() => {
        const fetchBusinessData = async () => {
            try {
                setLoadingData(true);

                // Try to fetch business data using businessId or businessEmail from service
                const businessId = service.businessId || service.businessEmail;

                if (!businessId) {
                    throw new Error("Business ID not found in service data");
                }

                const businessRef = doc(db, "Businesses", businessId);
                const businessDoc = await getDoc(businessRef);

                if (businessDoc.exists()) {
                    const data = {
                        businessId: businessDoc.id,
                        ...businessDoc.data()
                    };
                    setBusinessData(data);
                } else {
                    // If not found in Businesses collection, use basic data from service
                    setBusinessData({
                        businessId: businessId,
                        businessName: service.businessName || "Business",
                        businessHours: defaultBusinessHours
                    });
                }

                setLoadingData(false);
            } catch (error) {
                console.error("Error fetching business data:", error);
                // Use basic business data if fetch fails
                setBusinessData({
                    businessId: service.businessId || service.businessEmail,
                    businessName: service.businessName || "Business",
                    businessHours: defaultBusinessHours
                });
                setLoadingData(false);
            }
        };

        fetchBusinessData();
    }, [service]);

    // Generate available dates based on business hours
    useEffect(() => {
        if (!businessData) return;

        const generateAvailableDates = () => {
            const dates = [];
            const today = new Date();

            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(today.getDate() + i);

                // Check if business is open on this day
                const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const dayHours = businessData?.businessHours?.[dayOfWeek] || defaultBusinessHours[dayOfWeek];

                if (dayHours && dayHours.isOpen) {
                    dates.push(new Date(date));
                }
            }

            setAvailableDates(dates);
        };

        generateAvailableDates();
    }, [businessData]);

    // Fetch existing bookings for the service provider
    useEffect(() => {
        if (!businessData?.businessId || !selectedDate) return;

        const fetchBookings = async () => {
            try {
                // Create date range for the selected date (start and end of day)
                const startDate = new Date(selectedDate);
                startDate.setHours(0, 0, 0, 0);

                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);

                const q = query(
                    collection(db, "bookings"),
                    where("businessId", "==", businessData.businessId),
                    where("dateTime", ">=", Timestamp.fromDate(startDate)),
                    where("dateTime", "<=", Timestamp.fromDate(endDate))
                );

                const querySnapshot = await getDocs(q);
                const bookings = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    dateTime: doc.data().dateTime?.toDate()
                }));

                setExistingBookings(bookings);
            } catch (error) {
                console.error("Error fetching existing bookings:", error);
                setExistingBookings([]);
            }
        };

        fetchBookings();
    }, [businessData, selectedDate]);

    // Generate available time slots and excluded times based on business hours and existing bookings
    useEffect(() => {
        if (!selectedDate || !service?.duration || !businessData) return;

        const generateTimeData = () => {
            const date = new Date(selectedDate);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            const dayHours = businessData.businessHours?.[dayOfWeek] || defaultBusinessHours[dayOfWeek];

            // If business is closed on selected day
            if (!dayHours || !dayHours.isOpen) {
                setAvailableSlots([]);
                return;
            }

            const serviceDuration = parseInt(service.duration); // in minutes
            const slots = [];
            const excludedTimes = [];

            // Parse opening and closing times
            const [startHour, startMinute] = dayHours.start.split(':').map(Number);
            const [endHour, endMinute] = dayHours.end.split(':').map(Number);

            // Create slots in 30-minute increments
            const slotIncrement = 30; // minutes

            // Start time in minutes since midnight
            let currentMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            // Subtract service duration to ensure last appointment can finish before closing
            const lastPossibleSlot = endMinutes - serviceDuration;

            while (currentMinutes <= lastPossibleSlot) {
                const hour = Math.floor(currentMinutes / 60);
                const minute = currentMinutes % 60;

                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                // Create a date object for this time slot
                const slotDate = new Date(selectedDate);
                slotDate.setHours(hour, minute, 0, 0);

                const slotEndDate = new Date(slotDate);
                slotEndDate.setMinutes(slotDate.getMinutes() + serviceDuration);

                const isBooked = existingBookings.some(booking => {
                    const bookingStart = booking.dateTime;
                    const bookingEnd = new Date(bookingStart);

                    // Find the associated service to get duration
                    let bookingDuration = 60; // default 60 min if we can't find the actual duration
                    if (booking.serviceId) {
                        // This is simplified - ideally we'd have the actual service duration
                        bookingDuration = booking.duration || 60; // placeholder
                    }

                    bookingEnd.setMinutes(bookingStart.getMinutes() + bookingDuration);

                    // Check if there's an overlap
                    return (
                        (slotDate >= bookingStart && slotDate < bookingEnd) || // Slot start during booking
                        (slotEndDate > bookingStart && slotEndDate <= bookingEnd) || // Slot end during booking
                        (slotDate <= bookingStart && slotEndDate >= bookingEnd) // Slot completely contains booking
                    );
                });

                if (isBooked) {
                    // Add this time to the excluded times
                    const excludedTime = new Date(slotDate);
                    excludedTimes.push(excludedTime);
                } else {
                    slots.push(timeString);
                }

                currentMinutes += slotIncrement;
            }

            setAvailableSlots(slots);

            // We return the excluded times array to use in the component state
            return excludedTimes;
        };

        const excludedTimes = generateTimeData();
        // Update the state with excluded times
        setExcludedTimes(excludedTimes || []);
    }, [selectedDate, service, businessData, existingBookings]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors({
                ...validationErrors,
                [name]: null
            });
        }
    };

    // Validate form data
    const validateForm = () => {
        const errors = {};

        if (!selectedDateTime) {
            errors.date = 'Please select a date';
            errors.time = 'Please select a time';
        } else {
            // If there's a date but no time component (hours and minutes are 0)
            if (selectedDateTime.getHours() === 0 && selectedDateTime.getMinutes() === 0) {
                errors.time = 'Please select a time';
            }

            // Check if the date component is today or future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateToCheck = new Date(selectedDateTime);
            dateToCheck.setHours(0, 0, 0, 0);

            if (dateToCheck < today) {
                errors.date = 'Please select today or a future date';
            }
        }

        if (!formData.customerName.trim()) {
            errors.customerName = 'Name is required';
        }

        if (!formData.customerPhone.trim()) {
            errors.customerPhone = 'Phone number is required';
        } else if (!/^(\+\d{1,3}[- ]?)?\d{10}$/.test(formData.customerPhone.replace(/\s+/g, ''))) {
            errors.customerPhone = 'Please enter a valid phone number';
        }

        if (formData.customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
            errors.customerEmail = 'Please enter a valid email address';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }

        try {
            setLoading(true);

            // Use the selected DateTime directly
            const dateTime = selectedDateTime;

            // Create booking record
            const bookingData = {
                businessId: businessData.businessId,
                businessName: businessData.businessName || service.businessName || "Business",
                serviceId: service.id,
                serviceName: service.name,
                dateTime: Timestamp.fromDate(dateTime),
                status: 'pending',
                ...formData,
                userId: currentUser?.uid || null,
                customerEmail: currentUser?.email || formData.customerEmail,
                createdAt: Timestamp.now(),
                price: service.price || 0,
                duration: service.duration || 60
            };

            // Add to Firestore
            const docRef = await addDoc(collection(db, "bookings"), bookingData);

            setBookingDetails({
                id: docRef.id,
                ...bookingData,
                dateTime: dateTime
            });
            setBookingSuccess(true);
            setLoading(false);

            toast.success("Booking request submitted successfully!");

            // After a delay, close the modal and call onSuccess
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess({
                        id: docRef.id,
                        ...bookingData,
                        dateTime: dateTime
                    });
                }
            }, 2000);
        } catch (error) {
            console.error("Error submitting booking:", error);
            toast.error("There was an error submitting your booking. Please try again.");
            setLoading(false);
        }
    };

    // Generate date options (next 30 days)
    const generateDateOptions = () => {
        const options = [];
        const today = new Date();

        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);

            // Skip dates when business is closed
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const dayHours = businessData?.businessHours?.[dayOfWeek] || defaultBusinessHours[dayOfWeek];

            if (dayHours && dayHours.isOpen) {
                const dateString = date.toISOString().split('T')[0];
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                options.push(
                    <option key={dateString} value={dateString}>
                        {formattedDate}
                    </option>
                );
            }
        }

        return options;
    };

    // Format date for display
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render booking success view
    const renderBookingSuccess = () => {
        return (
            <div className="booking-success">
                <div className="booking-success-icon">
                    <Calendar size={36} />
                </div>
                <h3>Booking Request Submitted!</h3>
                <p>Your booking request has been sent to {businessData.businessName}. You will receive a confirmation soon.</p>

                <div className="booking-details-summary">
                    <div className="booking-detail-item">
                        <div className="booking-detail-label">Service</div>
                        <div className="booking-detail-value">{service.name}</div>
                    </div>
                    <div className="booking-detail-item">
                        <div className="booking-detail-label">Date</div>
                        <div className="booking-detail-value">{formatDate(bookingDetails.dateTime)}</div>
                    </div>
                    <div className="booking-detail-item">
                        <div className="booking-detail-label">Time</div>
                        <div className="booking-detail-value">{formatTime(bookingDetails.dateTime)}</div>
                    </div>
                    <div className="booking-detail-item">
                        <div className="booking-detail-label">Status</div>
                        <div className="booking-detail-value">Pending Confirmation</div>
                    </div>
                </div>

                <button
                    className="btn-primary"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        );
    };

    if (loadingData) {
        return (
            <div className="service-booking-modal">
                <div className="service-booking-modal-content">
                    <div className="service-booking-modal-header">
                        <h2>Loading Service Details</h2>
                        <button className="close-button" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading service details...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="service-booking-modal">
            <div className="service-booking-modal-content">
                <div className="service-booking-modal-header">
                    <h2>Book Service</h2>
                    <button className="close-button" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="service-booking-modal-body">
                    {!bookingSuccess ? (
                        <>
                            <div className="service-details-card">
                                <div className="service-image-container">
                                    {service.images && service.images.length > 0 ? (
                                        <img
                                            src={typeof service.images[0] === 'string' ? service.images[0] : service.images[0].url}
                                            alt={service.name}
                                            className="service-image"
                                        />
                                    ) : (
                                        <div className="no-image-container">No Image Available</div>
                                    )}
                                </div>

                                <div className="service-details">
                                    <div className="service-title">
                                        <h3>{service.name}</h3>
                                        <p className="business-name">{businessData.businessName}</p>
                                    </div>

                                    <div className="service-meta">
                                        <div className="service-meta-item">
                                            <Clock size={16} />
                                            <span>{service.duration} min</span>
                                        </div>

                                        <div className="service-meta-item">
                                            <IndianRupee size={16} />
                                            <span>{service.price}</span>
                                        </div>

                                        {service.category && (
                                            <div className="service-meta-item">
                                                <Tag size={16} />
                                                <span>{service.category}</span>
                                            </div>
                                        )}
                                    </div>

                                    {service.description && (
                                        <div className="service-description">
                                            <p>{service.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="booking-form">
                                <div className="form-section">
                                    <h4 className="section-title">Select Date & Time</h4>

                                    <div className="date-time-fields-container">
                                        <div className={`form-group ${validationErrors.date ? 'has-error' : ''}`}>
                                            <label htmlFor="appointmentDate">
                                                <Calendar size={14} />
                                                Select Date
                                            </label>
                                            <div className="datepicker-container">
                                                <DatePicker
                                                    selected={selectedDateTime}
                                                    onChange={(date) => {
                                                        // Create a new date with the selected date but keep current time
                                                        const newDateTime = new Date(selectedDateTime || new Date());
                                                        newDateTime.setFullYear(date.getFullYear());
                                                        newDateTime.setMonth(date.getMonth());
                                                        newDateTime.setDate(date.getDate());
                                                        setSelectedDateTime(newDateTime);

                                                        // Also update the individual date for compatibility
                                                        const dateString = newDateTime.toISOString().split('T')[0];
                                                        setSelectedDate(dateString);

                                                        // Clear validation errors
                                                        setValidationErrors({
                                                            ...validationErrors,
                                                            date: null
                                                        });
                                                    }}
                                                    includeDates={availableDates}
                                                    minDate={new Date()}
                                                    dateFormat="MMMM d, yyyy"
                                                    placeholderText="Click to select date"
                                                    className="form-control date-picker"
                                                    calendarClassName="purple-themed-calendar"
                                                    dayClassName={date =>
                                                        date.getDate() === new Date().getDate() &&
                                                            date.getMonth() === new Date().getMonth() ?
                                                            "today-date" : undefined
                                                    }
                                                    popperModifiers={{
                                                        preventOverflow: {
                                                            enabled: true,
                                                        },
                                                    }}
                                                    popperPlacement="bottom"
                                                    showMonthDropdown
                                                    showYearDropdown
                                                    dropdownMode="select"
                                                />
                                                <div className="date-time-icon">
                                                    <Calendar size={18} />
                                                </div>
                                            </div>
                                            {validationErrors.date && (
                                                <div className="error-message">
                                                    <AlertCircle size={14} />
                                                    {validationErrors.date}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`form-group ${validationErrors.time ? 'has-error' : ''}`}>
                                            <label htmlFor="appointmentTime">
                                                <Clock size={14} />
                                                Select Time
                                            </label>
                                            <div className="datepicker-container">
                                                <DatePicker
                                                    selected={selectedDateTime}
                                                    onChange={(date) => {
                                                        // Create a new date with the current date but selected time
                                                        const newDateTime = new Date(selectedDateTime || new Date());
                                                        newDateTime.setHours(date.getHours());
                                                        newDateTime.setMinutes(date.getMinutes());
                                                        setSelectedDateTime(newDateTime);

                                                        // Also update the individual time for compatibility
                                                        const hours = newDateTime.getHours().toString().padStart(2, '0');
                                                        const minutes = newDateTime.getMinutes().toString().padStart(2, '0');
                                                        setSelectedTime(`${hours}:${minutes}`);

                                                        // Clear validation errors
                                                        setValidationErrors({
                                                            ...validationErrors,
                                                            time: null
                                                        });
                                                    }}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={30}
                                                    timeCaption="Time"
                                                    dateFormat="h:mm aa"
                                                    placeholderText="Click to select time"
                                                    className="form-control time-picker"
                                                    calendarClassName="purple-themed-calendar"
                                                    timeClassName={() => "time-option"}
                                                    filterTime={(time) => {
                                                        // Only show times when the business is open
                                                        if (!selectedDateTime) return false;

                                                        const dayOfWeek = selectedDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                                                        const dayHours = businessData?.businessHours?.[dayOfWeek] || defaultBusinessHours[dayOfWeek];

                                                        if (!dayHours || !dayHours.isOpen) return false;

                                                        // Parse opening and closing times
                                                        const [startHour, startMinute] = dayHours.start.split(':').map(Number);
                                                        const [endHour, endMinute] = dayHours.end.split(':').map(Number);

                                                        const timeHour = time.getHours();
                                                        const timeMinute = time.getMinutes();

                                                        // Convert to minutes since midnight for easy comparison
                                                        const timeInMinutes = timeHour * 60 + timeMinute;
                                                        const startInMinutes = startHour * 60 + startMinute;
                                                        const endInMinutes = endHour * 60 + endMinute;

                                                        // Check if the time is within business hours minus service duration
                                                        const serviceDuration = parseInt(service.duration) || 60;
                                                        return timeInMinutes >= startInMinutes && timeInMinutes <= (endInMinutes - serviceDuration);
                                                    }}
                                                    excludeTimes={excludedTimes}
                                                />
                                                <div className="date-time-icon">
                                                    <Clock size={18} />
                                                </div>
                                            </div>
                                            {validationErrors.time && (
                                                <div className="error-message">
                                                    <AlertCircle size={14} />
                                                    {validationErrors.time}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4 className="section-title">Your Details</h4>

                                    <div className={`form-group ${validationErrors.customerName ? 'has-error' : ''}`}>
                                        <label htmlFor="customerName">
                                            <User size={14} />
                                            Name*
                                        </label>
                                        <input
                                            type="text"
                                            id="customerName"
                                            name="customerName"
                                            className="form-control"
                                            value={formData.customerName}
                                            onChange={handleChange}
                                            placeholder="Your full name"
                                            required
                                        />
                                        {validationErrors.customerName && (
                                            <div className="error-message">
                                                <AlertCircle size={14} />
                                                {validationErrors.customerName}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`form-group ${validationErrors.customerPhone ? 'has-error' : ''}`}>
                                        <label htmlFor="customerPhone">
                                            <Phone size={14} />
                                            Phone Number*
                                        </label>
                                        <input
                                            type="tel"
                                            id="customerPhone"
                                            name="customerPhone"
                                            className="form-control"
                                            value={formData.customerPhone}
                                            onChange={handleChange}
                                            placeholder="Your phone number"
                                            required
                                        />
                                        {validationErrors.customerPhone && (
                                            <div className="error-message">
                                                <AlertCircle size={14} />
                                                {validationErrors.customerPhone}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`form-group ${validationErrors.customerEmail ? 'has-error' : ''}`}>
                                        <label htmlFor="customerEmail">
                                            <Mail size={14} />
                                            Email {!currentUser ? '(optional)' : ''}
                                        </label>
                                        <input
                                            type="email"
                                            id="customerEmail"
                                            name="customerEmail"
                                            className="form-control"
                                            value={formData.customerEmail}
                                            onChange={handleChange}
                                            placeholder="Your email address"
                                            disabled={!!currentUser}
                                        />
                                        {validationErrors.customerEmail && (
                                            <div className="error-message">
                                                <AlertCircle size={14} />
                                                {validationErrors.customerEmail}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-section">
                                    <div className="form-group">
                                        <label htmlFor="notes">
                                            <FileText size={14} />
                                            Additional Notes (optional)
                                        </label>
                                        <textarea
                                            id="notes"
                                            name="notes"
                                            className="form-control"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            placeholder="Any special requests or information"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="booking-actions">
                                    <button
                                        type="submit"
                                        className="btn-book"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="spinner-sm"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} />
                                                Confirm Booking
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        renderBookingSuccess()
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceBookingModal;
