import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, MapPin, X, Check, AlertTriangle,
    MessageSquare, RefreshCw, Star, CreditCard, IndianRupee,
    Calendar as CalendarIcon, User, Phone, Mail, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings, updateBookingStatus } from '../../Firebase/bookingDb';
import { startConversationWithBusiness } from '../../Firebase/messageDb';
import { addReview, hasUserReviewed } from '../../Firebase/reviewDb_new';
import ReviewForm from '../miniComponents/ReviewForm';
import './EnhancedUserBookings.css';
import { color } from 'framer-motion';

function EnhancedUserBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [expandedBooking, setExpandedBooking] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [showRescheduleForm, setShowRescheduleForm] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewableBookings, setReviewableBookings] = useState({});
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({
        bookingId: '',
        newDate: '',
        newTime: '',
        reason: ''
    });
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);
                const userBookings = await getCustomerBookings(currentUser.email);
                console.log('Fetched user bookings:', userBookings);

                // Check for any status issues (null, undefined, or unexpected values)
                userBookings.forEach(booking => {
                    if (!booking.status) {
                        console.warn(`Booking ${booking.id} (${booking.serviceName}) has no status!`);
                    } else if (booking.status.toLowerCase() === 'completed') {
                        console.log(`Found completed booking: ${booking.id} (${booking.serviceName})`);
                    }
                });

                setBookings(userBookings);

                // Check which completed bookings can be reviewed
                const reviewableStatus = {};

                if (userBookings && userBookings.length > 0) {
                    const completedBookings = userBookings.filter(booking =>
                        booking.status && booking.status.toLowerCase() === 'completed'
                    );

                    for (const booking of completedBookings) {
                        try {
                            // Check if user has already reviewed this booking
                            const hasReviewed = await hasUserReviewed(
                                currentUser.email,
                                'service',
                                booking.serviceId
                            );

                            reviewableStatus[booking.id] = !hasReviewed;
                        } catch (error) {
                            console.error("Error checking review status:", error);
                            reviewableStatus[booking.id] = true; // Assume reviewable on error
                        }
                    }
                }

                setReviewableBookings(reviewableStatus);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                setLoading(false);
            }
        };

        fetchBookings();
    }, [currentUser]);

    const handleContactBusiness = async (booking) => {
        try {
            if (!currentUser?.email) {
                alert("Please login to contact business");
                return;
            }

            // Start conversation with initial message about the booking
            const initialMessage = `Hi! I have a booking for ${booking.serviceName} on ${new Date(booking.dateTime).toLocaleDateString()}. I'd like to discuss this with you.`;

            // Use businessEmail if available, fallback to businessId
            const businessContactEmail = booking.businessEmail || booking.businessId;
            const businessContactName = booking.businessName || 'Business';

            await startConversationWithBusiness(
                currentUser.email,
                businessContactEmail,
                initialMessage,
                businessContactName
            );

            // Show success message
            alert("Conversation started! Check your messages to continue chatting.");

        } catch (error) {
            console.error("Error starting conversation:", error);
            alert("Failed to start conversation. Please try again.");
        }
    };

    const handleCancelBooking = async (bookingId) => {
        try {
            if (window.confirm("Are you sure you want to cancel this booking?")) {
                await updateBookingStatus(bookingId, 'cancelled');
                setBookings(bookings.map(booking =>
                    booking.id === bookingId
                        ? { ...booking, status: 'cancelled' }
                        : booking
                ));
                alert("Booking cancelled successfully.");
            }
        } catch (error) {
            console.error("Error cancelling booking:", error);
            alert("Failed to cancel booking. Please try again.");
        }
    };

    const handleRequestReschedule = (booking) => {
        setSelectedBooking(booking);
        setRescheduleData({
            bookingId: booking.id,
            newDate: '',
            newTime: '',
            reason: ''
        });
        setShowRescheduleForm(true);
    };

    const handleSubmitRescheduleRequest = async () => {
        try {
            if (!rescheduleData.newDate || !rescheduleData.newTime) {
                alert("Please select a new date and time for your booking.");
                return;
            }

            // Combine date and time into a single datetime
            const newDateTime = new Date(rescheduleData.newDate);
            const [hours, minutes] = rescheduleData.newTime.split(':').map(Number);
            newDateTime.setHours(hours, minutes, 0, 0);

            // Update booking with reschedule request
            await updateBookingStatus(rescheduleData.bookingId, 'reschedule_requested');

            // Add reschedule information to the booking
            const updatedBookings = bookings.map(booking =>
                booking.id === rescheduleData.bookingId
                    ? {
                        ...booking,
                        status: 'reschedule_requested',
                        requestedDateTime: newDateTime,
                        rescheduleReason: rescheduleData.reason,
                        updatedAt: new Date()
                    }
                    : booking
            );

            setBookings(updatedBookings);

            // Clear form and close
            setShowRescheduleForm(false);
            setRescheduleData({
                bookingId: '',
                newDate: '',
                newTime: '',
                reason: ''
            });

            alert("Reschedule request submitted successfully!");
        } catch (error) {
            console.error("Error requesting reschedule:", error);
            alert("Failed to submit reschedule request. Please try again.");
        }
    };

    const handleOpenReviewForm = (booking) => {
        setSelectedBooking(booking);
        setShowReviewForm(true);
    };

    const handleSubmitReview = async (reviewData) => {
        if (!currentUser || !selectedBooking) return;

        try {
            // The addReview function expects separate parameters, not an object
            await addReview(
                'service',
                (selectedBooking.businessEmail || selectedBooking.businessId),
                selectedBooking.serviceId,
                currentUser.uid,
                currentUser.displayName || 'Anonymous User',
                reviewData.rating,
                reviewData.comment,
                currentUser.photoURL || '',
                selectedBooking.id
            );

            // Update the reviewable status for this booking
            setReviewableBookings({
                ...reviewableBookings,
                [selectedBooking.id]: false
            });

            alert("Review submitted successfully!");
            setShowReviewForm(false);
            return true;
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review. Please try again.");
            throw new Error("Failed to submit review. Please try again.");
        }
    };

    const handleCloseReviewForm = () => {
        setShowReviewForm(false);
        setSelectedBooking(null);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusClass = (status) => {
        // Convert status to lowercase for case-insensitive comparison
        const statusLower = status?.toLowerCase() || '';

        switch (statusLower) {
            case 'confirmed': return 'status-confirmed';
            case 'pending': return 'status-pending';
            case 'cancelled': return 'status-cancelled';
            case 'completed': return 'status-completed';
            case 'reschedule_requested': return 'status-rescheduled';
            case 'rescheduled': return 'status-rescheduled';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        // Convert status to lowercase for case-insensitive comparison
        const statusLower = status?.toLowerCase() || '';

        switch (statusLower) {
            case 'confirmed': return <Check size={16} />;
            case 'pending': return <Clock size={16} />;
            case 'cancelled': return <X size={16} />;
            case 'completed': return <Check size={16} />;
            case 'reschedule_requested': return <RefreshCw size={16} />;
            case 'rescheduled': return <RefreshCw size={16} />;
            default: return <AlertTriangle size={16} />;
        }
    };

    const getStatusText = (status) => {
        // Convert status to lowercase for case-insensitive comparison
        const statusLower = status?.toLowerCase() || '';

        switch (statusLower) {
            case 'reschedule_requested': return 'Reschedule Requested';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'rescheduled': return 'Rescheduled';
            default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
        }
    };

    const getPaymentMethodIcon = (method) => {
        switch (method) {
            case 'pay_now': return <CreditCard size={16} />;
            case 'pay_at_store': return <IndianRupee size={16} />;
            default: return <IndianRupee size={16} />;
        }
    };

    const getPaymentMethodText = (method) => {
        switch (method) {
            case 'pay_now': return 'Paid Online';
            case 'pay_at_store': return 'Pay at Store';
            default: return 'Payment Method Not Specified';
        }
    };

    // Debug all bookings before filtering
    console.log('All bookings before filtering:', bookings.map(b => ({
        id: b.id,
        name: b.serviceName,
        status: b.status,
        date: b.dateTime?.toDate?.() || new Date(b.dateTime)
    })));

    const filteredBookings = bookings.filter(booking => {
        // Make sure we handle both Firestore Timestamp and regular date strings
        const bookingDate = booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime);
        const now = new Date();

        // Normalize status to lowercase for consistent comparison
        const status = booking.status?.toLowerCase() || '';

        console.log(`Filtering booking: ${booking.serviceName}, status: ${status}, date: ${bookingDate}, tab: ${activeTab}`);

        if (activeTab === 'upcoming') {
            // Only show future bookings that are not cancelled and not completed
            return bookingDate > now && status !== 'cancelled' && status !== 'completed';
        } else if (activeTab === 'past') {
            // Show past bookings or any completed bookings (regardless of date)
            return bookingDate < now || status === 'completed';
        } else if (activeTab === 'cancelled') {
            return status === 'cancelled';
        }
        return true;
    });

    return (
        <div className="enhanced-user-bookings">
            <div className="bookings-header">
                <h2>My Bookings</h2>
                <p>Manage your service appointments and reservations</p>
            </div>

            <div className="booking-tabs">
                <button
                    className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upcoming')}
                >
                    <Calendar size={16} />
                    Upcoming
                </button>
                <button
                    className={`tab ${activeTab === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveTab('past')}
                >
                    <Clock size={16} />
                    Past
                </button>
                <button
                    className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                >
                    <X size={16} />
                    Cancelled
                </button>
            </div>

            {loading ? (
                <div className="bookings-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your bookings...</p>
                </div>
            ) : (
                <>
                    {filteredBookings.length === 0 ? (
                        <div className="empty-bookings">
                            <div className="empty-bookings-icon">
                                <Calendar size={48} />
                            </div>
                            <h3>No {activeTab} bookings found</h3>
                            {activeTab === 'upcoming' && (
                                <p>When you book services, they will appear here</p>
                            )}
                            {activeTab === 'upcoming' && (
                                <button className="primary-button" onClick={() => window.location.href = '/user-dashboard/explore'}>
                                    Book a Service
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bookings-list">
                            {filteredBookings.map(booking => (
                                <div key={booking.id} className={`booking-card ${expandedBooking === booking.id ? 'expanded' : ''}`}>
                                    <div
                                        className="booking-header"
                                        onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}
                                    >
                                        <div className="booking-main-info">
                                            <h3>{booking.serviceName || 'Service Appointment'}</h3>
                                            <div className="booking-business">
                                                <span>{booking.businessName}</span>
                                            </div>
                                        </div>
                                        <div className={`booking-status ${getStatusClass(booking.status)}`}>
                                            {getStatusIcon(booking.status)}
                                            <span>{getStatusText(booking.status)}</span>
                                        </div>
                                    </div>

                                    <div className="booking-summary">
                                        <div className="booking-detail">
                                            <Calendar size={16} />
                                            <span>{formatDate(booking.dateTime)}</span>
                                        </div>
                                        <div className="booking-detail">
                                            <Clock size={16} />
                                            <span>{formatTime(booking.dateTime)}</span>
                                        </div>

                                        {booking.price && (
                                            <div className="booking-detail">
                                                <IndianRupee size={16} />
                                                <span>₹{booking.price}</span>
                                            </div>
                                        )}

                                        {booking.paymentMethod && (
                                            <div className="booking-detail">
                                                {getPaymentMethodIcon(booking.paymentMethod)}
                                                <span>{getPaymentMethodText(booking.paymentMethod)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {expandedBooking === booking.id && (
                                        <div className="booking-expanded">
                                            {booking.location && (
                                                <div className="expanded-section">
                                                    <h4>Location</h4>
                                                    <div className="location-info">
                                                        <MapPin size={16} />
                                                        <span>{booking.location}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {booking.notes && (
                                                <div className="expanded-section">
                                                    <h4>Your Notes</h4>
                                                    <div className="booking-notes">
                                                        {booking.notes}
                                                    </div>
                                                </div>
                                            )}

                                            {booking.status === 'reschedule_requested' && booking.requestedDateTime && (
                                                <div className="expanded-section reschedule-info">
                                                    <h4>Reschedule Request</h4>
                                                    <div className="reschedule-details">
                                                        <div className="reschedule-detail">
                                                            <Calendar size={16} />
                                                            <span>Requested for: {formatDate(booking.requestedDateTime)}</span>
                                                        </div>
                                                        <div className="reschedule-detail">
                                                            <Clock size={16} />
                                                            <span>At: {formatTime(booking.requestedDateTime)}</span>
                                                        </div>
                                                        {booking.rescheduleReason && (
                                                            <div className="reschedule-reason">
                                                                <strong>Reason:</strong> {booking.rescheduleReason}
                                                            </div>
                                                        )}
                                                        <div className="reschedule-status">
                                                            <AlertTriangle size={16} />
                                                            <span>Awaiting business approval</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="booking-actions">
                                                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                    <>
                                                        <button
                                                            className="btn-danger"
                                                            onClick={() => handleCancelBooking(booking.id)}
                                                        >
                                                            <X size={16} />
                                                            Cancel Booking
                                                        </button>
                                                        <button
                                                            className="btn-secondary"
                                                            onClick={() => handleRequestReschedule(booking)}
                                                        >
                                                            <RefreshCw size={16} />
                                                            Request Reschedule
                                                        </button>
                                                    </>
                                                )}

                                                {booking.status === 'completed' && reviewableBookings[booking.id] && (
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => handleOpenReviewForm(booking)}
                                                    >
                                                        <Star size={16} />
                                                        Leave a Review
                                                    </button>
                                                )}

                                                <button
                                                    className="btn-primary"
                                                    onClick={() => handleContactBusiness(booking)}
                                                >
                                                    <MessageSquare size={16} />
                                                    Contact Business
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {showReviewForm && selectedBooking && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Leave a Review</h3>
                            <button className="close-btn" onClick={handleCloseReviewForm}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <ReviewForm
                                entityName={selectedBooking.serviceName}
                                entityType="service"
                                onSubmit={handleSubmitReview}
                                onCancel={handleCloseReviewForm}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showRescheduleForm && selectedBooking && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3 style={{ color: "white" }}>Request Reschedule</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowRescheduleForm(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>
                                    <Calendar size={16} />
                                    New Date
                                </label>
                                <input
                                    type="date"
                                    value={rescheduleData.newDate}
                                    onChange={(e) => setRescheduleData({
                                        ...rescheduleData,
                                        newDate: e.target.value
                                    })}
                                    className="form-control"
                                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <Clock size={16} />
                                    New Time
                                </label>
                                <input
                                    type="time"
                                    value={rescheduleData.newTime}
                                    onChange={(e) => setRescheduleData({
                                        ...rescheduleData,
                                        newTime: e.target.value
                                    })}
                                    className="form-control"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <FileText size={16} />
                                    Reason (optional)
                                </label>
                                <textarea
                                    value={rescheduleData.reason}
                                    onChange={(e) => setRescheduleData({
                                        ...rescheduleData,
                                        reason: e.target.value
                                    })}
                                    className="form-control"
                                    placeholder="Please provide a reason for rescheduling"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowRescheduleForm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSubmitRescheduleRequest}
                                disabled={!rescheduleData.newDate || !rescheduleData.newTime}
                            >
                                <RefreshCw size={16} />
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EnhancedUserBookings;
