import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../Firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ArrowLeft, Calendar, Clock, DollarSign, Tag, User } from 'lucide-react';
import BookingForm from '../BusinessOwner/Services/Bookings/BookingForm';
import './UserDashboard.css';
import '../BusinessOwner/Services/Bookings/BookingForm.css';

const ServiceBooking = () => {
    const { serviceId, businessId } = useParams();
    const navigate = useNavigate();

    const [service, setService] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);

    // Fetch service and business data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch service data
                const serviceDocRef = doc(db, "services", serviceId);
                const serviceDoc = await getDoc(serviceDocRef);

                if (!serviceDoc.exists()) {
                    toast.error("Service not found");
                    navigate(-1);
                    return;
                }

                const serviceData = {
                    id: serviceDoc.id,
                    ...serviceDoc.data()
                };

                setService(serviceData);

                // Fetch business data
                const businessDocRef = doc(db, "business_users", businessId);
                const businessDoc = await getDoc(businessDocRef);

                if (!businessDoc.exists()) {
                    toast.error("Business not found");
                    navigate(-1);
                    return;
                }

                const businessData = {
                    businessId: businessDoc.id,
                    ...businessDoc.data()
                };

                setBusinessData(businessData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load service details");
                setLoading(false);
            }
        };

        fetchData();
    }, [serviceId, businessId, navigate]);

    // Handle booking success
    const handleBookingSuccess = (bookingData) => {
        setBookingSuccess(true);
        setBookingDetails(bookingData);
        window.scrollTo(0, 0);
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
                    onClick={() => navigate('/user-dashboard')}
                >
                    <User size={18} />
                    Go to Dashboard
                </button>
            </div>
        );
    };

    // Main render method
    if (loading) {
        return (
            <div className="user-dashboard-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading service details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-dashboard-theme">
            <div className="user-dashboard-container">
                <div className="user-dashboard-content">
                    <div className="service-booking-container">
                        <div className="service-booking-header">
                            <button className="back-button" onClick={() => navigate(-1)}>
                                <ArrowLeft size={18} />
                                <span>Back</span>
                            </button>
                            <h2>{service.name}</h2>
                            <div className="business-name">{businessData.businessName}</div>
                        </div>

                        {!bookingSuccess ? (
                            <div className="service-booking-content">
                                <div className="service-details-card">
                                    <div className="service-image-container">
                                        {service.images && service.images.length > 0 ? (
                                            <img
                                                src={service.images[0].url}
                                                alt={service.name}
                                                className="service-image"
                                            />
                                        ) : (
                                            <div className="no-image-container">No Image Available</div>
                                        )}
                                    </div>

                                    <div className="service-details">
                                        <h3>{service.name}</h3>

                                        <div className="service-meta">
                                            <div className="service-meta-item">
                                                <Clock size={16} />
                                                <span>{service.duration} min</span>
                                            </div>

                                            <div className="service-meta-item">
                                                <DollarSign size={16} />
                                                <span>₹{service.price}</span>
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
                                                <h4>Description</h4>
                                                <p>{service.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <BookingForm
                                    service={service}
                                    businessData={businessData}
                                    onSuccess={handleBookingSuccess}
                                />
                            </div>
                        ) : (
                            renderBookingSuccess()
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceBooking;
