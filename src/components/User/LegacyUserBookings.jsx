import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, X, Check, AlertTriangle, MessageSquare } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings, updateBookingStatus } from '../../Firebase/bookingDb';
import { startConversationWithBusiness } from '../../Firebase/messageDb';
import { addReview, hasUserReviewed } from '../../Firebase/reviewDb_new';
import ReviewForm from '../miniComponents/ReviewForm';
import './UserBookings.css';

function LegacyUserBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [expandedBooking, setExpandedBooking] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewableBookings, setReviewableBookings] = useState({});
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchBookings = async () => {
            if (!currentUser) return;

            try {
                const userBookings = await getCustomerBookings(currentUser.email);
                setBookings(userBookings);

                // Check which completed bookings can be reviewed
                const reviewableStatus = {};

                if (userBookings && userBookings.length > 0) {
                    const completedBookings = userBookings.filter(booking =>
                        booking.status === 'completed'
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
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
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

            console.log('🔄 Starting conversation from booking:', {
                customerEmail: currentUser.email,
                businessEmail: businessContactEmail,
                businessName: businessContactName,
                initialMessage
            });

            await startConversationWithBusiness(
                currentUser.email,
                businessContactEmail,
                initialMessage,
                businessContactName
            );

            // Navigate to messages (you might want to use React Router for this)
            alert("Conversation started! Check your messages to continue chatting.");

        } catch (error) {
            console.error("Error starting conversation:", error);
            alert("Failed to start conversation. Please try again.");
        }
    };

    const handleCancelBooking = async (bookingId) => {
        try {
            await updateBookingStatus(bookingId, 'cancelled');
            setBookings(bookings.map(booking =>
                booking.id === bookingId
                    ? { ...booking, status: 'cancelled' }
                    : booking
            ));
        } catch (error) {
            console.error("Error cancelling booking:", error);
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

            return true;
        } catch (error) {
            console.error("Error submitting review:", error);
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
        switch (status) {
            case 'confirmed': return 'status-confirmed';
            case 'pending': return 'status-pending';
            case 'cancelled': return 'status-cancelled';
            case 'completed': return 'status-completed';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed': return <Check size={16} />;
            case 'pending': return <Clock size={16} />;
            case 'cancelled': return <X size={16} />;
            case 'completed': return <Check size={16} />;
            default: return <AlertTriangle size={16} />;
        }
    };

    const filteredBookings = bookings.filter(booking => {
        const bookingDate = booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime);
        const now = new Date();

        if (activeTab === 'upcoming') {
            return bookingDate > now && booking.status !== 'cancelled';
        } else if (activeTab === 'past') {
            return bookingDate < now || booking.status === 'completed';
        } else if (activeTab === 'cancelled') {
            return booking.status === 'cancelled';
        }
        return true;
    });

    return (
        <div className="user-bookings">
            <h2>My Bookings</h2>

            <div className="booking-tabs">
                <button
                    className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upcoming')}
                >
                    Upcoming
                </button>
                <button
                    className={`tab ${activeTab === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveTab('past')}
                >
                    Past
                </button>
                <button
                    className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                >
                    Cancelled
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your bookings...</p>
                </div>
            ) : (
                <>
                    {filteredBookings.length === 0 ? (
                        <div className="empty-bookings">
                            <Calendar size={48} />
                            <p>No {activeTab} bookings found.</p>
                            {activeTab === 'upcoming' && (
                                <button className="btn-primary">
                                    Book a Service
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bookings-list">
                            {filteredBookings.map(booking => (
                                <div key={booking.id} className="booking-card">
                                    <div className="booking-header">
                                        <h3>{booking.serviceName || 'Service Appointment'}</h3>
                                        <div className={`booking-status ${getStatusClass(booking.status)}`}>
                                            {getStatusIcon(booking.status)}
                                            <span>{booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}</span>
                                        </div>
                                    </div>

                                    <div className="booking-details">
                                        <div className="detail-item">
                                            <Calendar size={16} />
                                            <span>{formatDate(booking.dateTime)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <Clock size={16} />
                                            <span>{formatTime(booking.dateTime)}</span>
                                        </div>
                                        {booking.location && (
                                            <div className="detail-item">
                                                <MapPin size={16} />
                                                <span>{booking.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="booking-business">
                                        <p>Business: <strong>{booking.businessName}</strong></p>
                                    </div>

                                    {booking.price && (
                                        <div className="booking-price">
                                            <p>Price: <strong>₹{booking.price.toFixed(2)}</strong></p>
                                        </div>
                                    )}

                                    {booking.notes && (
                                        <div className="booking-notes">
                                            <p>{booking.notes}</p>
                                        </div>
                                    )}

                                    <div className="booking-actions">
                                        {booking.status === 'pending' || booking.status === 'confirmed' ? (
                                            <button
                                                className="btn-danger cancel-booking"
                                                onClick={() => handleCancelBooking(booking.id)}
                                            >
                                                Cancel Booking
                                            </button>
                                        ) : null}

                                        {booking.status === 'completed' && reviewableBookings[booking.id] && (
                                            <button
                                                className="btn-outline leave-review"
                                                onClick={() => handleOpenReviewForm(booking)}
                                            >
                                                Leave a Review
                                            </button>
                                        )}

                                        <button
                                            className="btn-outline contact-business"
                                            onClick={() => handleContactBusiness(booking)}
                                        >
                                            <MessageSquare size={16} />
                                            Contact Business
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {showReviewForm && selectedBooking && (
                <div className="modal-overlay">
                    <ReviewForm
                        entityName={selectedBooking.serviceName}
                        entityType="service"
                        onSubmit={handleSubmitReview}
                        onCancel={handleCloseReviewForm}
                    />
                </div>
            )}
        </div>
    );
}

export default LegacyUserBookings;
