import React, { useState } from 'react';
import { Check, X, Clock, Calendar, User, Phone, Mail, Scissors } from 'lucide-react';

const BookingsList = ({ bookings, services, onViewBooking, onUpdateStatus }) => {
    const [expandedBooking, setExpandedBooking] = useState(null);

    // Format date for display
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
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

    // Get service details by ID
    const getServiceDetails = (serviceId) => {
        return services.find(s => s.id === serviceId) || {};
    };

    // Toggle expanded booking
    const toggleExpandBooking = (bookingId) => {
        if (expandedBooking === bookingId) {
            setExpandedBooking(null);
        } else {
            setExpandedBooking(bookingId);
        }
    };

    // Handle updating booking status
    const handleUpdateStatus = (e, bookingId, newStatus) => {
        e.stopPropagation(); // Prevent row click event
        onUpdateStatus(bookingId, newStatus);
    };

    // Get status class
    const getStatusClass = (status) => {
        switch (status) {
            case 'pending':
                return 'status-pending';
            case 'confirmed':
                return 'status-confirmed';
            case 'completed':
                return 'status-completed';
            case 'cancelled':
                return 'status-cancelled';
            case 'rescheduled':
                return 'status-rescheduled';
            default:
                return '';
        }
    };

    return (
        <div className="bookings-list-container">
            {bookings.length === 0 ? (
                <div className="no-bookings-container">
                    <div className="no-bookings-content">
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/4076/4076432.png"
                            alt="No bookings"
                            className="no-bookings-image"
                        />
                        <h3>No bookings found</h3>
                        <p>There are no bookings matching your current filters.</p>
                    </div>
                </div>
            ) : (
                <div className="bookings-table">
                    <div className="bookings-table-header">
                        <div className="bookings-header-cell date-col">Date & Time</div>
                        <div className="bookings-header-cell customer-col">Customer</div>
                        <div className="bookings-header-cell service-col">Service</div>
                        <div className="bookings-header-cell status-col">Status</div>
                        <div className="bookings-header-cell actions-col">Actions</div>
                    </div>

                    <div className="bookings-table-body">
                        {bookings.map(booking => {
                            const service = getServiceDetails(booking.serviceId);

                            return (
                                <React.Fragment key={booking.id}>
                                    <div
                                        className={`booking-row ${expandedBooking === booking.id ? 'expanded' : ''}`}
                                        onClick={() => toggleExpandBooking(booking.id)}
                                    >
                                        <div className="booking-cell date-col">
                                            <div className="date-time-container">
                                                <div className="booking-date">
                                                    <Calendar size={14} />
                                                    <span>{formatDate(booking.dateTime)}</span>
                                                </div>
                                                <div className="booking-time">
                                                    <Clock size={14} />
                                                    <span>{formatTime(booking.dateTime)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="booking-cell customer-col">
                                            <div className="customer-name">
                                                <User size={14} />
                                                <span>{booking.customerName}</span>
                                            </div>
                                            <div className="customer-phone">
                                                <Phone size={14} />
                                                <span>{booking.customerPhone}</span>
                                            </div>
                                        </div>

                                        <div className="booking-cell service-col">
                                            <div className="service-name">
                                                <Scissors size={14} />
                                                <span>{service.name}</span>
                                            </div>
                                            <div className="service-duration">
                                                <Clock size={14} />
                                                <span>{service.duration} Minutes</span>
                                            </div>
                                        </div>

                                        <div className="booking-cell status-col">
                                            <span className={`status-badge ${getStatusClass(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                        </div>

                                        <div className="booking-cell actions-col">
                                            <div className="booking-actions">
                                                <button
                                                    className="action-btn view-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewBooking(booking);
                                                    }}
                                                >
                                                    View
                                                </button>

                                                {booking.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="action-btn confirm-btn"
                                                            onClick={(e) => handleUpdateStatus(e, booking.id, 'confirmed')}
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            className="action-btn cancel-btn"
                                                            onClick={(e) => handleUpdateStatus(e, booking.id, 'cancelled')}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                )}

                                                {booking.status === 'confirmed' && (
                                                    <button
                                                        className="action-btn complete-btn"
                                                        onClick={(e) => handleUpdateStatus(e, booking.id, 'completed')}
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedBooking === booking.id && (
                                        <div className="booking-expanded-details">
                                            <div className="expanded-details-grid">
                                                <div className="expanded-detail-group">
                                                    <h4>Customer Details</h4>
                                                    <div className="detail-item">
                                                        <User size={16} />
                                                        <span><strong>Name:</strong> {booking.customerName}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <Phone size={16} />
                                                        <span><strong>Phone:</strong> {booking.customerPhone}</span>
                                                    </div>
                                                    {booking.customerEmail && (
                                                        <div className="detail-item">
                                                            <Mail size={16} />
                                                            <span><strong>Email:</strong> {booking.customerEmail}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="expanded-detail-group">
                                                    <h4>Booking Details</h4>
                                                    <div className="detail-item">
                                                        <Scissors size={16} />
                                                        <span><strong>Service:</strong> {service.name}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <Clock size={16} />
                                                        <span><strong>Duration:</strong> {service.duration} minutes</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <Calendar size={16} />
                                                        <span><strong>Date:</strong> {formatDate(booking.dateTime)}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <Clock size={16} />
                                                        <span><strong>Time:</strong> {formatTime(booking.dateTime)}</span>
                                                    </div>
                                                </div>

                                                {booking.notes && (
                                                    <div className="expanded-detail-group full-width">
                                                        <h4>Notes</h4>
                                                        <div className="booking-notes">
                                                            {booking.notes}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="expanded-actions">
                                                <button
                                                    className="btn-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewBooking(booking);
                                                    }}
                                                >
                                                    View Full Details
                                                </button>

                                                {booking.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn-success"
                                                            onClick={(e) => handleUpdateStatus(e, booking.id, 'confirmed')}
                                                        >
                                                            <Check size={16} />
                                                            Confirm Booking
                                                        </button>
                                                        <button
                                                            className="btn-danger"
                                                            onClick={(e) => handleUpdateStatus(e, booking.id, 'cancelled')}
                                                        >
                                                            <X size={16} />
                                                            Cancel Booking
                                                        </button>
                                                    </>
                                                )}

                                                {booking.status === 'confirmed' && (
                                                    <button
                                                        className="btn-success"
                                                        onClick={(e) => handleUpdateStatus(e, booking.id, 'completed')}
                                                    >
                                                        <Check size={16} />
                                                        Mark as Completed
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingsList;
