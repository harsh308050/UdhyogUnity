import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../Firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ArrowLeft, Calendar, Clock, IndianRupee, Tag, User } from 'lucide-react';
import BookingForm from '../BusinessOwner/Services/Bookings/BookingForm';
// import './UserDashboard.css';
import './ServiceBooking.css';
// import '../BusinessOwner/Services/Bookings/BookingForm.css';

const ServiceBooking = () => {
    const params = useParams();
    const navigate = useNavigate();

    // Handle both possible parameter orders
    const serviceId = params.serviceId;
    const businessId = params.businessId;

    const [service, setService] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingDetails, setBookingDetails] = useState(null);

    // Try to get the service from session storage first
    useEffect(() => {
        try {
            const storedService = sessionStorage.getItem('bookingService');
            if (storedService) {
                const parsedService = JSON.parse(storedService);
                console.log("Retrieved service from session storage:", parsedService);

                // Validate that it matches our service ID
                if (parsedService.id === serviceId) {
                    setService(parsedService);
                    console.log("Using service from session storage");

                    // Also set businessData if possible
                    if (parsedService.businessId || parsedService.businessEmail) {
                        setBusinessData({
                            businessId: parsedService.businessId || parsedService.businessEmail,
                            businessName: parsedService.businessName || "Business",
                            // Set minimal business data from the service
                            businessHours: {
                                monday: { start: '09:00', end: '18:00', isOpen: true },
                                tuesday: { start: '09:00', end: '18:00', isOpen: true },
                                wednesday: { start: '09:00', end: '18:00', isOpen: true },
                                thursday: { start: '09:00', end: '18:00', isOpen: true },
                                friday: { start: '09:00', end: '18:00', isOpen: true },
                                saturday: { start: '10:00', end: '16:00', isOpen: true },
                                sunday: { start: '10:00', end: '14:00', isOpen: false }
                            }
                        });
                        setLoading(false);
                        return; // Skip the fetch data if we have everything
                    }
                }
            }
        } catch (error) {
            console.error("Error retrieving service from session storage:", error);
        }
    }, [serviceId]);

    // Log params for debugging
    useEffect(() => {
        console.log('ServiceBooking Params:', { serviceId, businessId });

        // Debug logging to help understand the issue
        const debugService = async () => {
            try {
                console.log('DEBUG: Fetching service collections structure');
                // Try to get all services to understand structure
                const servicesRef = collection(db, "Services");
                const servicesSnapshot = await getDocs(servicesRef);
                console.log(`DEBUG: Found ${servicesSnapshot.size} services in root Services collection`);

                if (servicesSnapshot.size > 0) {
                    console.log('First 5 service IDs:');
                    let count = 0;
                    servicesSnapshot.docs.forEach(doc => {
                        if (count < 5) {
                            console.log(`- Service ID: ${doc.id}`);
                            count++;
                        }
                    });
                }

                // Try to access the businessId directly to see what's there
                if (businessId) {
                    console.log(`DEBUG: Checking businessId: ${businessId}`);

                    // Check if businessId exists in Services collection
                    const businessRef = doc(db, "Services", businessId);
                    const businessDoc = await getDoc(businessRef);
                    console.log(`DEBUG: BusinessId exists in Services collection: ${businessDoc.exists()}`);

                    if (businessDoc.exists()) {
                        console.log('DEBUG: BusinessId data in Services:', businessDoc.data());
                    }

                    // Check for Active subcollection (proper one according to serviceDb.js)
                    const activeServicesRef = collection(db, "Services", businessId, "Active");
                    const activeServicesSnapshot = await getDocs(activeServicesRef);
                    console.log(`DEBUG: Found ${activeServicesSnapshot.size} services in Active subcollection`);

                    if (activeServicesSnapshot.size > 0) {
                        console.log('First 5 active service IDs:');
                        let count = 0;
                        activeServicesSnapshot.docs.forEach(doc => {
                            if (count < 5) {
                                console.log(`- Active Service ID: ${doc.id}`);
                                count++;
                            }
                        });
                    }

                    // Also check for ActiveServices subcollection (older format)
                    const oldActiveServicesRef = collection(db, "Services", businessId, "ActiveServices");
                    const oldActiveServicesSnapshot = await getDocs(oldActiveServicesRef);
                    console.log(`DEBUG: Found ${oldActiveServicesSnapshot.size} services in legacy ActiveServices subcollection`);
                }
            } catch (error) {
                console.error('DEBUG: Error during debug fetching:', error);
            }
        };

        debugService();
    }, [serviceId, businessId]);

    // Fetch service and business data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                console.log('Starting to fetch service and business data');

                // Get session storage service first
                let serviceData = null;
                const storedServiceJson = sessionStorage.getItem('bookingService');

                if (storedServiceJson) {
                    try {
                        const parsedService = JSON.parse(storedServiceJson);
                        if (parsedService.id === serviceId) {
                            serviceData = parsedService;
                            console.log('Service retrieved from session storage:', serviceData);
                        }
                    } catch (err) {
                        console.error("Error parsing session storage service:", err);
                    }
                }

                // If not found in session storage, try Firestore paths
                if (!serviceData) {
                    console.log('Service not found in session storage, trying Firestore paths');

                    // Try path 1: Services/businessId/Active/serviceId
                    try {
                        console.log(`Trying path 1: Services/${businessId}/Active/${serviceId}`);
                        const serviceRef1 = doc(db, "Services", businessId, "Active", serviceId);
                        const serviceDoc = await getDoc(serviceRef1);
                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceDoc.id,
                                ...serviceDoc.data()
                            };
                            console.log('Service found in Services/businessId/Active/serviceId:', serviceData);
                        }
                    } catch (err) {
                        console.log("Service not found in Services/businessId/Active/serviceId", err);
                    }
                }

                // Try path 2: Services/businessId/Inactive/serviceId (some services might be inactive)
                if (!serviceData) {
                    try {
                        console.log(`Trying path 2: Services/${businessId}/Inactive/${serviceId}`);
                        const serviceRef2 = doc(db, "Services", businessId, "Inactive", serviceId);
                        const serviceDoc = await getDoc(serviceRef2);
                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceDoc.id,
                                ...serviceDoc.data()
                            };
                            console.log('Service found in Services/businessId/Inactive/serviceId:', serviceData);
                        }
                    } catch (err) {
                        console.log("Service not found in Services/businessId/Inactive/serviceId", err);
                    }
                }

                // Try path 3: Services/businessId/ActiveServices/serviceId (for backward compatibility)
                if (!serviceData) {
                    try {
                        console.log(`Trying path 3: Services/${businessId}/Active/${serviceId}`);
                        const serviceRef3 = doc(db, "Services", businessId, "Active", serviceId);
                        const serviceDoc = await getDoc(serviceRef3);
                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceDoc.id,
                                ...serviceDoc.data()
                            };
                            console.log('Service found in Services/businessId/ActiveServices/serviceId:', serviceData);
                        }
                    } catch (err) {
                        console.log("Service not found in Services/businessId/ActiveServices/serviceId", err);
                    }
                }

                // Try path 4: Services/serviceId
                if (!serviceData) {
                    try {
                        console.log(`Trying path 4: Services/${serviceId}`);
                        const serviceRef4 = doc(db, "Services", serviceId);
                        const serviceDoc = await getDoc(serviceRef4);
                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceDoc.id,
                                ...serviceDoc.data()
                            };
                            console.log('Service found in Services/serviceId:', serviceData);
                        }
                    } catch (err) {
                        console.log("Service not found in Services/serviceId", err);
                    }
                }

                // Try path 5: Try with switched parameters (in case they got swapped)
                if (!serviceData) {
                    try {
                        console.log(`Trying path 5: Services/${serviceId}/Active/${businessId}`);
                        const serviceRef5 = doc(db, "Services", serviceId, "Active", businessId);
                        const serviceDoc = await getDoc(serviceRef5);
                        if (serviceDoc.exists()) {
                            serviceData = {
                                id: serviceDoc.id,
                                ...serviceDoc.data()
                            };
                            console.log('Service found with switched parameters:', serviceData);
                        }
                    } catch (err) {
                        console.log("Service not found with switched parameters", err);
                    }
                }

                // If still not found, show error
                if (!serviceData) {
                    console.error("Service not found in any location");
                    toast.error("Service not found");
                    navigate('/user-dashboard');
                    return;
                }

                setService(serviceData);
                console.log('Service data set successfully', serviceData);

                // Fetch business data - try different possible paths
                let businessData = null;

                // Try path 1: 'Businesses' collection
                try {
                    console.log(`Trying to fetch business from Businesses collection: ${businessId}`);
                    const businessRef1 = doc(db, "Businesses", businessId);
                    const businessDoc = await getDoc(businessRef1);
                    if (businessDoc.exists()) {
                        businessData = {
                            businessId: businessDoc.id,
                            ...businessDoc.data()
                        };
                        console.log('Business found in Businesses collection', businessData);
                    }
                } catch (err) {
                    console.log("Business not found in Businesses collection", err);
                }

                // If not found, try using businessEmail from service data
                if (!businessData && serviceData.businessEmail) {
                    try {
                        console.log(`Trying to fetch business using businessEmail from service: ${serviceData.businessEmail}`);
                        const businessRef2 = doc(db, "Businesses", serviceData.businessEmail);
                        const businessDoc = await getDoc(businessRef2);
                        if (businessDoc.exists()) {
                            businessData = {
                                businessId: businessDoc.id,
                                ...businessDoc.data()
                            };
                            console.log('Business found using businessEmail from service', businessData);
                        }
                    } catch (err) {
                        console.log("Business not found using businessEmail from service", err);
                    }
                }

                // If still not found, use minimal data from the service
                if (!businessData) {
                    console.log("Business not found in Businesses collection, using minimal data from service");
                    businessData = {
                        businessId: serviceData.businessId || serviceData.businessEmail || businessId,
                        businessName: serviceData.businessName || "Business",
                        // Default business hours
                        businessHours: {
                            monday: { start: '09:00', end: '18:00', isOpen: true },
                            tuesday: { start: '09:00', end: '18:00', isOpen: true },
                            wednesday: { start: '09:00', end: '18:00', isOpen: true },
                            thursday: { start: '09:00', end: '18:00', isOpen: true },
                            friday: { start: '09:00', end: '18:00', isOpen: true },
                            saturday: { start: '10:00', end: '16:00', isOpen: true },
                            sunday: { start: '10:00', end: '14:00', isOpen: false }
                        }
                    };
                }

                setBusinessData(businessData);
                console.log('Business data set successfully', businessData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load service details");
                setLoading(false);
                navigate('/user-dashboard');
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
                    onClick={() => navigate('/user-dashboard/bookings')}
                >
                    <User size={18} />
                    View My Bookings
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
                            <button className="back-button" onClick={() => navigate('/user-dashboard')}>
                                <ArrowLeft size={18} />
                                <span>Back to Dashboard</span>
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
                                                <IndianRupee size={16} />
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
