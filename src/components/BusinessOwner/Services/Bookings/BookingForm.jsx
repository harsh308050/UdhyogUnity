import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle, AlertCircle } from 'lucide-react';
// import { addBooking } from '../../../../Firebase/bookingDb';
// import { generateAvailableTimeSlots } from '../../../../Firebase/scheduleDb';
import { db } from '../../../../Firebase/config';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../../context/AuthContext';
import './BookingForm.css';

const BookingForm = ({ service, businessData, onSuccess }) => {
    // const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
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

    // Get business hours from businessData or use defaults
    const businessHours = businessData?.businessHours || defaultBusinessHours;

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
            }
        };

        fetchBookings();
    }, [businessData, selectedDate]);

    // Generate available time slots based on business hours and existing bookings
    useEffect(() => {
        if (!selectedDate || !service?.duration) return;

        const generateTimeSlots = () => {
            const date = new Date(selectedDate);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });

            const dayHours = businessHours[dayOfWeek];

            // If business is closed on selected day
            if (!dayHours || !dayHours.isOpen) {
                setAvailableSlots([]);
                return;
            }

            const serviceDuration = parseInt(service.duration); // in minutes
            const slots = [];

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

                // Check if this slot overlaps with existing bookings
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
                        bookingDuration = 60; // placeholder
                    }

                    bookingEnd.setMinutes(bookingStart.getMinutes() + bookingDuration);

                    // Check if there's an overlap
                    return (
                        (slotDate >= bookingStart && slotDate < bookingEnd) || // Slot start during booking
                        (slotEndDate > bookingStart && slotEndDate <= bookingEnd) || // Slot end during booking
                        (slotDate <= bookingStart && slotEndDate >= bookingEnd) // Slot completely contains booking
                    );
                });

                if (!isBooked) {
                    slots.push(timeString);
                }

                currentMinutes += slotIncrement;
            }

            setAvailableSlots(slots);
        };

        generateTimeSlots();
    }, [selectedDate, service, businessHours, existingBookings]);

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

        if (!selectedDate) {
            errors.date = 'Please select a date';
        }

        if (!selectedTime) {
            errors.time = 'Please select a time';
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

            // Create datetime object
            const dateTime = new Date(selectedDate);
            const [hours, minutes] = selectedTime.split(':').map(Number);
            dateTime.setHours(hours, minutes, 0, 0);

            // Create booking record
            const bookingData = {
                businessId: businessData.businessId || businessData.email,
                businessName: businessData.businessName || businessData.name || "Business",
                serviceId: service.id,
                serviceName: service.name,
                dateTime: Timestamp.fromDate(dateTime),
                status: 'pending',
                ...formData,
                userId: currentUser?.uid || null,
                customerEmail: currentUser?.email || formData.customerEmail, // Ensure this field exists
                createdAt: Timestamp.now(),
                price: service.price || 0
            };

            // Add to Firestore
            const docRef = await addDoc(collection(db, "bookings"), bookingData);

            setLoading(false);
            toast.success("Booking request submitted successfully!");

            // Call onSuccess callback with booking info
            if (onSuccess) {
                onSuccess({
                    id: docRef.id,
                    ...bookingData,
                    dateTime: dateTime
                });
            }
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
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
            const dayHours = businessHours[dayOfWeek];

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

    return (
        <div className="booking-form-container">
            <h3 className="booking-form-title">
                <Calendar size={20} />
                Book an Appointment
            </h3>

            <div className="service-summary">
                <div className="service-image">
                    {service.images && service.images.length > 0 ? (
                        <img
                            src={service.images[0].url}
                            alt={service.name}
                        />
                    ) : (
                        <div className="no-image">No Image</div>
                    )}
                </div>
                <div className="service-info">
                    <h4>{service.name}</h4>
                    <div className="service-details">
                        <span className="service-duration">
                            <Clock size={14} />
                            {service.duration} Minutes
                        </span>
                        <span className="service-price">
                            ₹{service.price}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <h4 className="section-title">Select Date & Time</h4>

                    <div className={`form-group ${validationErrors.date ? 'has-error' : ''}`}>
                        <label htmlFor="appointmentDate">Date</label>
                        <select
                            id="appointmentDate"
                            className="form-control"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedTime(''); // Reset time when date changes
                                // Clear validation error
                                if (validationErrors.date) {
                                    setValidationErrors({ ...validationErrors, date: null });
                                }
                            }}
                            required
                        >
                            <option value="">Select a date</option>
                            {generateDateOptions()}
                        </select>
                        {validationErrors.date && (
                            <div className="error-message">
                                <AlertCircle size={14} />
                                {validationErrors.date}
                            </div>
                        )}
                    </div>

                    <div className={`form-group ${validationErrors.time ? 'has-error' : ''}`}>
                        <label htmlFor="appointmentTime">Time</label>
                        {selectedDate ? (
                            availableSlots.length > 0 ? (
                                <select
                                    id="appointmentTime"
                                    className="form-control"
                                    value={selectedTime}
                                    onChange={(e) => {
                                        setSelectedTime(e.target.value);
                                        // Clear validation error
                                        if (validationErrors.time) {
                                            setValidationErrors({ ...validationErrors, time: null });
                                        }
                                    }}
                                    required
                                >
                                    <option value="">Select a time</option>
                                    {availableSlots.map(time => (
                                        <option key={time} value={time}>
                                            {time}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="no-slots-message">
                                    No available slots for this date. Please select another date.
                                </div>
                            )
                        ) : (
                            <div className="no-slots-message">
                                Please select a date first
                            </div>
                        )}
                        {validationErrors.time && (
                            <div className="error-message">
                                <AlertCircle size={14} />
                                {validationErrors.time}
                            </div>
                        )}
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
        </div>
    );
};

export default BookingForm;
