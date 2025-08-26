import React from 'react';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, MapPin, Scissors, IndianRupee, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const BookingDetails = ({ booking, serviceName, onBack, onUpdateStatus }) => {
    if (!booking) return null;

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

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <AlertTriangle size={20} />;
            case 'confirmed':
                return <CheckCircle size={20} />;
            case 'completed':
                return <CheckCircle size={20} />;
            case 'cancelled':
                return <XCircle size={20} />;
            default:
                return <AlertTriangle size={20} />;
        }
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

    // Get timestamp for a date
    const getTimestamp = (date) => {
        if (!date) return 'N/A';
        if (typeof date === 'object' && date.seconds) {
            // Firestore Timestamp
            return new Date(date.seconds * 1000).toLocaleString();
        }
        return new Date(date).toLocaleString();
    };

    return (
        <div className="booking-details-container">
            <div className="booking-details-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={18} />
                    <span>Back to Bookings</span>
                </button>
                <div className="booking-id">
                    <span>Booking ID:</span>
                    <span className="id-value">{booking.id}</span>
                </div>
            </div>

            <div className="booking-details-content">
                <div className="booking-status-section">
                    <div className={`booking-status ${getStatusClass(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                    </div>

                    <div className="booking-status-actions">
                        {booking.status === 'pending' && (
                            <>
                                <button
                                    className="btn-success"
                                    onClick={() => onUpdateStatus(booking.id, 'confirmed')}
                                >
                                    <CheckCircle size={16} />
                                    Confirm Booking
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                                >
                                    <XCircle size={16} />
                                    Cancel Booking
                                </button>
                            </>
                        )}

                        {booking.status === 'confirmed' && (
                            <button
                                className="btn-success"
                                onClick={() => onUpdateStatus(booking.id, 'completed')}
                            >
                                <CheckCircle size={16} />
                                Mark as Completed
                            </button>
                        )}

                        {booking.status === 'cancelled' && (
                            <button
                                className="btn-primary"
                                onClick={() => onUpdateStatus(booking.id, 'pending')}
                            >
                                <AlertTriangle size={16} />
                                Reactivate Booking
                            </button>
                        )}
                    </div>
                </div>

                <div className="booking-details-grid">
                    <div className="booking-detail-section">
                        <h3 className="section-title">
                            <Calendar size={18} />
                            <span>Appointment Details</span>
                        </h3>
                        <div className="detail-items">
                            <div className="detail-item">
                                <div className="detail-label">Date</div>
                                <div className="detail-value">
                                    <Calendar size={16} />
                                    <span>{formatDate(booking.dateTime)}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Time</div>
                                <div className="detail-value">
                                    <Clock size={16} />
                                    <span>{formatTime(booking.dateTime)}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Service</div>
                                <div className="detail-value">
                                    <Scissors size={16} />
                                    <span>{serviceName}</span>
                                </div>
                            </div>
                            {booking.location && (
                                <div className="detail-item">
                                    <div className="detail-label">Location</div>
                                    <div className="detail-value">
                                        <MapPin size={16} />
                                        <span>{booking.location}</span>
                                    </div>
                                </div>
                            )}
                            {booking.price && (
                                <div className="detail-item">
                                    <div className="detail-label">Price</div>
                                    <div className="detail-value">
                                        <IndianRupee size={16} />
                                        <span>{formatPrice(booking.price)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="booking-detail-section">
                        <h3 className="section-title">
                            <User size={18} />
                            <span>Customer Details</span>
                        </h3>
                        <div className="detail-items">
                            <div className="detail-item">
                                <div className="detail-label">Name</div>
                                <div className="detail-value">
                                    <User size={16} />
                                    <span>{booking.customerName}</span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Phone</div>
                                <div className="detail-value">
                                    <Phone size={16} />
                                    <span>{booking.customerPhone}</span>
                                </div>
                            </div>
                            {booking.customerEmail && (
                                <div className="detail-item">
                                    <div className="detail-label">Email</div>
                                    <div className="detail-value">
                                        <Mail size={16} />
                                        <span>{booking.customerEmail}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {booking.notes && (
                    <div className="booking-detail-section full-width">
                        <h3 className="section-title">
                            <FileText size={18} />
                            <span>Notes</span>
                        </h3>
                        <div className="booking-notes">
                            {booking.notes}
                        </div>
                    </div>
                )}

                <div className="booking-detail-section full-width">
                    <h3 className="section-title">
                        <Clock size={18} />
                        <span>Timeline</span>
                    </h3>
                    <div className="booking-timeline">
                        <div className="timeline-item">
                            <div className="timeline-icon created"></div>
                            <div className="timeline-content">
                                <div className="timeline-title">Booking Created</div>
                                <div className="timeline-date">{getTimestamp(booking.createdAt)}</div>
                            </div>
                        </div>

                        {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                            <div className="timeline-item">
                                <div className="timeline-icon updated"></div>
                                <div className="timeline-content">
                                    <div className="timeline-title">Last Updated</div>
                                    <div className="timeline-date">{getTimestamp(booking.updatedAt)}</div>
                                </div>
                            </div>
                        )}

                        {booking.status === 'confirmed' && (
                            <div className="timeline-item">
                                <div className="timeline-icon confirmed"></div>
                                <div className="timeline-content">
                                    <div className="timeline-title">Booking Confirmed</div>
                                    <div className="timeline-date">{getTimestamp(booking.confirmedAt || booking.updatedAt)}</div>
                                </div>
                            </div>
                        )}

                        {booking.status === 'completed' && (
                            <div className="timeline-item">
                                <div className="timeline-icon completed"></div>
                                <div className="timeline-content">
                                    <div className="timeline-title">Service Completed</div>
                                    <div className="timeline-date">{getTimestamp(booking.completedAt || booking.updatedAt)}</div>
                                </div>
                            </div>
                        )}

                        {booking.status === 'cancelled' && (
                            <div className="timeline-item">
                                <div className="timeline-icon cancelled"></div>
                                <div className="timeline-content">
                                    <div className="timeline-title">Booking Cancelled</div>
                                    <div className="timeline-date">{getTimestamp(booking.cancelledAt || booking.updatedAt)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetails;
