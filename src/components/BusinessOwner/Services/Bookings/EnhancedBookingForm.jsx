import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Calendar, Clock, User, Phone, Mail, FileText, CheckCircle,
    CreditCard, IndianRupee, Calendar as CalendarIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { addBooking } from '../../../../Firebase/bookingDb';
import { generateAvailableTimeSlots } from '../../../../Firebase/scheduleDb';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../Firebase/config';
import './BookingForm.css';

const EnhancedBookingForm = ({ service, businessData, onSuccess }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [paymentMethod, setPaymentMethod] = useState('pay_at_store');

    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
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

    // Generate calendar dates for the current month
    useEffect(() => {
        const generateDates = () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();

            // Get the first day of the month
            const firstDay = new Date(year, month, 1);

            // Get the last day of the month
            const lastDay = new Date(year, month + 1, 0);

            // Get the day of the week of the first day (0 = Sunday, 6 = Saturday)
            const firstDayOfWeek = firstDay.getDay();

            // Create an array to hold all the dates
            const dates = [];

            // Add empty cells for days before the first day of the month
            for (let i = 0; i < firstDayOfWeek; i++) {
                dates.push({ date: null, available: false });
            }

            // Add all the days of the month
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const date = new Date(year, month, day);
                const dateString = date.toISOString().split('T')[0];

                // Check if it's a business day
                const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
                const dayHours = businessHours[dayOfWeek];

                // Check if the date is in the past
                const isPast = date < new Date().setHours(0, 0, 0, 0);

                // Calculate availability
                const isAvailable = !isPast && dayHours && dayHours.isOpen;

                dates.push({
                    date,
                    dateString,
                    day,
                    available: isAvailable,
                    isToday: dateString === new Date().toISOString().split('T')[0]
                });
            }

            setAvailableDates(dates);
        };

        generateDates();
    }, [currentMonth, businessHours]);

    // Fetch existing bookings for the service provider when date changes
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

                slots.push({
                    time: timeString,
                    available: !isBooked
                });

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
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedDate || !selectedTime) {
            toast.error("Please select a date and time for your appointment");
            return;
        }

        if (!formData.customerName || !formData.customerPhone) {
            toast.error("Please provide your name and phone number");
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
                businessId: businessData.businessId,
                businessName: businessData.businessName,
                serviceId: service.id,
                serviceName: service.name,
                dateTime: Timestamp.fromDate(dateTime),
                status: 'pending',
                paymentMethod: paymentMethod,
                paymentStatus: paymentMethod === 'pay_now' ? 'paid' : 'pending',
                price: service.price,
                duration: service.duration,
                ...formData,
                createdAt: Timestamp.now()
            };

            // Add to Firestore
            const booking = await addBooking(bookingData);

            setLoading(false);
            toast.success("Booking request submitted successfully!");

            // Call onSuccess callback with booking info
            if (onSuccess) {
                onSuccess({
                    id: booking.id,
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

    // Handle month navigation
    const goToPreviousMonth = () => {
        const prevMonth = new Date(currentMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        setCurrentMonth(prevMonth);
    };

    const goToNextMonth = () => {
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setCurrentMonth(nextMonth);
    };

    // Format the current month and year
    const formatMonthYear = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Check if a previous month is allowed (not before current month)
    const isPrevMonthAllowed = () => {
        const today = new Date();
        return !(
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    // Limit to next 3 months
    const isNextMonthAllowed = () => {
        const today = new Date();
        const maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 3);

        return !(
            currentMonth.getMonth() === maxDate.getMonth() &&
            currentMonth.getFullYear() === maxDate.getFullYear()
        );
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
                    <h4 className="section-title">Select Date</h4>

                    <div className="date-picker-container">
                        <div className="month-selector">
                            <button
                                type="button"
                                className="month-nav-btn"
                                onClick={goToPreviousMonth}
                                disabled={!isPrevMonthAllowed()}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="current-month">{formatMonthYear(currentMonth)}</span>
                            <button
                                type="button"
                                className="month-nav-btn"
                                onClick={goToNextMonth}
                                disabled={!isNextMonthAllowed()}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="week-days">
                            <div className="week-day">Sun</div>
                            <div className="week-day">Mon</div>
                            <div className="week-day">Tue</div>
                            <div className="week-day">Wed</div>
                            <div className="week-day">Thu</div>
                            <div className="week-day">Fri</div>
                            <div className="week-day">Sat</div>
                        </div>

                        <div className="date-grid">
                            {availableDates.map((dateObj, index) => (
                                <div
                                    key={index}
                                    className={`date-cell ${dateObj.date ? '' : 'empty'} ${dateObj.isToday ? 'today' : ''
                                        } ${dateObj.available ? '' : 'unavailable'} ${dateObj.dateString === selectedDate ? 'selected' : ''
                                        }`}
                                    onClick={() => {
                                        if (dateObj.date && dateObj.available) {
                                            setSelectedDate(dateObj.dateString);
                                            setSelectedTime(''); // Reset time when date changes
                                        }
                                    }}
                                >
                                    {dateObj.day}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h4 className="section-title">Select Time</h4>

                    {selectedDate ? (
                        availableSlots.length > 0 ? (
                            <div className="time-slots">
                                {availableSlots.map(slot => (
                                    <div
                                        key={slot.time}
                                        className={`time-slot ${slot.time === selectedTime ? 'selected' : ''
                                            } ${slot.available ? '' : 'unavailable'}`}
                                        onClick={() => {
                                            if (slot.available) {
                                                setSelectedTime(slot.time);
                                            }
                                        }}
                                    >
                                        {slot.time}
                                    </div>
                                ))}
                            </div>
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
                </div>

                <div className="form-section">
                    <h4 className="section-title">Payment Method</h4>

                    <div className="payment-methods">
                        <div className="payment-method">
                            <input
                                type="radio"
                                id="pay_at_store"
                                name="paymentMethod"
                                value="pay_at_store"
                                checked={paymentMethod === 'pay_at_store'}
                                onChange={() => setPaymentMethod('pay_at_store')}
                            />
                            <label htmlFor="pay_at_store" className="payment-method-label">
                                <div className="payment-icon">
                                    <IndianRupee size={16} />
                                </div>
                                Pay at Store
                            </label>
                        </div>

                        <div className="payment-method">
                            <input
                                type="radio"
                                id="pay_now"
                                name="paymentMethod"
                                value="pay_now"
                                checked={paymentMethod === 'pay_now'}
                                onChange={() => setPaymentMethod('pay_now')}
                            />
                            <label htmlFor="pay_now" className="payment-method-label">
                                <div className="payment-icon">
                                    <CreditCard size={16} />
                                </div>
                                Pay Now Online
                            </label>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h4 className="section-title">Your Details</h4>

                    <div className="form-group">
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
                    </div>

                    <div className="form-group">
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
                    </div>

                    <div className="form-group">
                        <label htmlFor="customerEmail">
                            <Mail size={14} />
                            Email (optional)
                        </label>
                        <input
                            type="email"
                            id="customerEmail"
                            name="customerEmail"
                            className="form-control"
                            value={formData.customerEmail}
                            onChange={handleChange}
                            placeholder="Your email address"
                        />
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
                        disabled={loading || !selectedDate || !selectedTime}
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

export default EnhancedBookingForm;
