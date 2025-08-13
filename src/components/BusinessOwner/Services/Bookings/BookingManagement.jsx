import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Calendar, Clock, User, Phone, Check, X, AlertTriangle, Calendar as CalendarIcon, List, Filter as FilterIcon } from 'lucide-react';
import { getBusinessBookings, updateBookingStatus, getBookingById } from '../../../../Firebase/bookingDb';
import { getBusinessServices } from '../../../../Firebase/serviceDb';
import CalendarView from './CalendarView';
import BookingsList from './BookingsList';
import BookingDetails from './BookingDetails';
import './Bookings.css';

const BookingManagement = ({ businessData }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('calendar'); // 'calendar', 'list', 'details'
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [services, setServices] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'upcoming',
        service: 'all'
    });

    // Fetch bookings and services on component mount
    useEffect(() => {
        fetchServices();
        fetchBookings();
    }, [businessData]);

    // Fetch services from Firestore
    const fetchServices = async () => {
        try {
            if (!businessData || !businessData.businessId) {
                console.error("Business data or businessId not available");
                return;
            }

            const servicesData = await getBusinessServices(businessData.businessId);
            setServices(servicesData);
        } catch (error) {
            console.error("Error fetching services:", error);
            toast.error("Failed to load services");
        }
    };

    // Fetch bookings from Firestore
    const fetchBookings = async () => {
        try {
            setLoading(true);

            if (!businessData || !businessData.businessId) {
                console.error("Business data or businessId not available");
                setLoading(false);
                return;
            }

            const bookingsData = await getBusinessBookings(businessData.businessId);

            // Convert Firestore timestamps to Date objects
            const formattedBookings = bookingsData.map(booking => ({
                ...booking,
                dateTime: booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime)
            }));

            setBookings(formattedBookings);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast.error("Failed to load bookings");
            setLoading(false);
        }
    };

    // Handle booking status update
    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            await updateBookingStatus(bookingId, newStatus);

            // Update local state
            setBookings(prev => prev.map(booking =>
                booking.id === bookingId
                    ? { ...booking, status: newStatus, updatedAt: new Date() }
                    : booking
            ));

            if (selectedBooking && selectedBooking.id === bookingId) {
                setSelectedBooking(prev => ({ ...prev, status: newStatus, updatedAt: new Date() }));
            }

            toast.success(`Booking ${newStatus.toLowerCase()}`);
        } catch (error) {
            console.error("Error updating booking status:", error);
            toast.error("Failed to update booking status");
        }
    };

    // Apply filters to bookings
    const filteredBookings = bookings.filter(booking => {
        // Filter by status
        if (filters.status !== 'all' && booking.status !== filters.status) {
            return false;
        }

        // Filter by date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filters.dateRange === 'today') {
            const bookingDate = new Date(booking.dateTime);
            const bookingDay = new Date(
                bookingDate.getFullYear(),
                bookingDate.getMonth(),
                bookingDate.getDate()
            );
            const todayDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );
            if (bookingDay.getTime() !== todayDate.getTime()) {
                return false;
            }
        } else if (filters.dateRange === 'upcoming') {
            if (booking.dateTime < today) {
                return false;
            }
        } else if (filters.dateRange === 'past') {
            if (booking.dateTime >= today) {
                return false;
            }
        }

        // Filter by service
        if (filters.service !== 'all' && booking.serviceId !== filters.service) {
            return false;
        }

        return true;
    });

    // Handle view switching
    const handleViewBooking = (booking) => {
        setSelectedBooking(booking);
        setView('details');
    };

    // Get service name by ID
    const getServiceName = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return service ? service.name : 'Unknown Service';
    };

    // Main render method
    const renderContent = () => {
        switch (view) {
            case 'calendar':
                return (
                    <CalendarView
                        bookings={filteredBookings}
                        services={services}
                        onViewBooking={handleViewBooking}
                        businessData={businessData}
                    />
                );
            case 'list':
                return (
                    <BookingsList
                        bookings={filteredBookings}
                        services={services}
                        onViewBooking={handleViewBooking}
                        onUpdateStatus={updateBookingStatus}
                    />
                );
            case 'details':
                return (
                    <BookingDetails
                        booking={selectedBooking}
                        serviceName={getServiceName(selectedBooking?.serviceId)}
                        onBack={() => setView(filters.dateRange === 'today' ? 'calendar' : 'list')}
                        onUpdateStatus={updateBookingStatus}
                    />
                );
            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <motion.div
            className="booking-management-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {view !== 'details' && (
                <div className="booking-header">
                    <div className="booking-title">
                        <h2>Service Bookings</h2>
                        <p>Manage your customer appointments and reservations</p>
                    </div>
                    <div className="booking-views">
                        <button
                            className={`view-btn ${view === 'calendar' ? 'active' : ''}`}
                            onClick={() => setView('calendar')}
                        >
                            <CalendarIcon size={18} />
                            <span>Calendar View</span>
                        </button>
                        <button
                            className={`view-btn ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                        >
                            <List size={18} />
                            <span>List View</span>
                        </button>
                    </div>
                </div>
            )}

            {view !== 'details' && (
                <div className="booking-filters">
                    <div className="filter-group">
                        <FilterIcon size={16} />
                        <label>Status:</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="filter-select"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <Calendar size={16} />
                        <label>Date:</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                            className="filter-select"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Service:</label>
                        <select
                            value={filters.service}
                            onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                            className="filter-select"
                        >
                            <option value="all">All Services</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading bookings...</p>
                </div>
            ) : (
                renderContent()
            )}
        </motion.div>
    );
};

export default BookingManagement;
