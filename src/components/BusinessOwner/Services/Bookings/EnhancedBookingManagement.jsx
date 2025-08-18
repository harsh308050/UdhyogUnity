import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    Calendar, Clock, User, Phone, Check, X, AlertTriangle,
    Calendar as CalendarIcon, List, Filter as FilterIcon,
    Search, Download, RotateCcw, CheckCircle, XCircle
} from 'lucide-react';
import { getBusinessBookings, updateBookingStatus, getBookingById, updateBooking } from '../../../../Firebase/bookingDb';
import { getBusinessServices } from '../../../../Firebase/serviceDb';
import CalendarView from './CalendarView';
import BookingsList from './BookingsList';
import BookingDetails from './BookingDetails';
// import './EBookings.css'; // Import the CSS for enhanced bookings
import './EnhancedBookings.css';
import './Bookings.css';

const EnhancedBookingManagement = ({ businessData }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('calendar'); // 'calendar', 'list', 'details'
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [services, setServices] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        today: 0,
        total: 0
    });
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'upcoming',
        service: 'all',
        searchTerm: ''
    });
    const [dateFilter, setDateFilter] = useState({
        startDate: null,
        endDate: null
    });
    const [isExporting, setIsExporting] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({
        bookingId: '',
        newDate: '',
        newTime: '',
        reason: ''
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
                console.error("Business data or businessId not available", businessData);
                return;
            }

            console.log("Fetching services for business:", businessData);

            // Make sure we have either email or businessId
            if (!businessData.email && !businessData.businessId) {
                console.error("Neither email nor businessId available in businessData:", businessData);
                return;
            }

            // Call getBusinessServices with the businessData object
            const servicesData = await getBusinessServices(businessData);
            console.log("Fetched services:", servicesData);
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

            if (!businessData) {
                console.error("Business data not available");
                setLoading(false);
                return;
            }

            // Determine the correct businessId to use for query
            let queryBusinessId = businessData.businessId;

            // If businessId is not available, try to create one from businessName
            if (!queryBusinessId && businessData.businessName) {
                queryBusinessId = businessData.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
                console.log("Created businessId from businessName:", queryBusinessId);
            }

            // Last resort, use email as businessId
            if (!queryBusinessId && businessData.email) {
                queryBusinessId = businessData.email.replace('@', '_at_');
                console.log("Using modified email as businessId:", queryBusinessId);
            }

            if (!queryBusinessId) {
                console.error("Could not determine a valid businessId for query", businessData);
                setLoading(false);
                return;
            }

            console.log("Fetching bookings for business:", queryBusinessId);
            const bookingsData = await getBusinessBookings(queryBusinessId);
            console.log("Fetched bookings data:", bookingsData);

            // Convert Firestore timestamps to Date objects
            const formattedBookings = bookingsData.map(booking => ({
                ...booking,
                dateTime: booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime)
            }));

            console.log("Formatted bookings:", formattedBookings);
            setBookings(formattedBookings);
            calculateStats(formattedBookings);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast.error("Failed to load bookings");
            setLoading(false);
        }
    };

    // Calculate booking statistics
    const calculateStats = (bookingsArray) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const stats = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            today: 0,
            total: bookingsArray.length
        };

        bookingsArray.forEach(booking => {
            // Count by status
            if (booking.status === 'pending') stats.pending++;
            else if (booking.status === 'confirmed') stats.confirmed++;
            else if (booking.status === 'completed') stats.completed++;
            else if (booking.status === 'cancelled') stats.cancelled++;

            // Count today's bookings
            const bookingDate = new Date(booking.dateTime);
            bookingDate.setHours(0, 0, 0, 0);

            if (bookingDate.getTime() === today.getTime()) {
                stats.today++;
            }
        });

        setStats(stats);
    };

    // Handle booking status update
    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            await updateBookingStatus(bookingId, newStatus);

            // Update local state
            const updatedBookings = bookings.map(booking =>
                booking.id === bookingId
                    ? { ...booking, status: newStatus, updatedAt: new Date() }
                    : booking
            );

            setBookings(updatedBookings);
            calculateStats(updatedBookings);

            if (selectedBooking && selectedBooking.id === bookingId) {
                setSelectedBooking(prev => ({ ...prev, status: newStatus, updatedAt: new Date() }));
            }

            const statusMessages = {
                confirmed: "Booking confirmed",
                completed: "Booking marked as completed",
                cancelled: "Booking cancelled",
                pending: "Booking reactivated"
            };

            toast.success(statusMessages[newStatus] || `Booking status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating booking status:", error);
            toast.error("Failed to update booking status");
        }
    };

    // Handle booking reschedule
    const handleReschedule = async () => {
        try {
            if (!rescheduleData.bookingId || !rescheduleData.newDate || !rescheduleData.newTime) {
                toast.error("Please fill all required fields");
                return;
            }

            // Get the booking
            const booking = await getBookingById(rescheduleData.bookingId);

            // Create new date time
            const newDateTime = new Date(rescheduleData.newDate);
            const [hours, minutes] = rescheduleData.newTime.split(':').map(Number);
            newDateTime.setHours(hours, minutes, 0, 0);

            // Update the booking
            const updateData = {
                dateTime: newDateTime,
                status: 'rescheduled',
                rescheduleReason: rescheduleData.reason,
                updatedAt: new Date()
            };

            await updateBooking(rescheduleData.bookingId, updateData);

            // Update local state
            const updatedBookings = bookings.map(booking =>
                booking.id === rescheduleData.bookingId
                    ? {
                        ...booking,
                        dateTime: newDateTime,
                        status: 'rescheduled',
                        rescheduleReason: rescheduleData.reason,
                        updatedAt: new Date()
                    }
                    : booking
            );

            setBookings(updatedBookings);
            calculateStats(updatedBookings);

            if (selectedBooking && selectedBooking.id === rescheduleData.bookingId) {
                setSelectedBooking(prev => ({
                    ...prev,
                    dateTime: newDateTime,
                    status: 'rescheduled',
                    rescheduleReason: rescheduleData.reason,
                    updatedAt: new Date()
                }));
            }

            toast.success("Booking rescheduled successfully");
            setIsRescheduling(false);
            setRescheduleData({
                bookingId: '',
                newDate: '',
                newTime: '',
                reason: ''
            });
        } catch (error) {
            console.error("Error rescheduling booking:", error);
            toast.error("Failed to reschedule booking");
        }
    };

    // Export bookings to CSV
    const exportToCSV = () => {
        try {
            setIsExporting(true);

            // Create CSV headers
            const headers = [
                'Booking ID',
                'Customer Name',
                'Phone',
                'Email',
                'Service',
                'Date',
                'Time',
                'Status',
                'Price',
                'Payment Method',
                'Payment Status',
                'Notes'
            ].join(',');

            // Format date for CSV
            const formatDate = (date) => {
                return new Date(date).toLocaleDateString();
            };

            // Format time for CSV
            const formatTime = (date) => {
                return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            // Create CSV rows
            const rows = filteredBookings.map(booking => {
                const service = services.find(s => s.id === booking.serviceId) || {};

                return [
                    booking.id,
                    `"${booking.customerName || ''}"`, // Quote names to handle commas
                    `"${booking.customerPhone || ''}"`,
                    `"${booking.customerEmail || ''}"`,
                    `"${service.name || booking.serviceName || ''}"`,
                    formatDate(booking.dateTime),
                    formatTime(booking.dateTime),
                    booking.status,
                    booking.price || service.price || '',
                    booking.paymentMethod || 'Not specified',
                    booking.paymentStatus || 'Not specified',
                    `"${booking.notes || ''}"` // Quote notes to handle commas
                ].join(',');
            });

            // Combine headers and rows
            const csv = [headers, ...rows].join('\n');

            // Create a download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Bookings exported to CSV");
            setIsExporting(false);
        } catch (error) {
            console.error("Error exporting bookings:", error);
            toast.error("Failed to export bookings");
            setIsExporting(false);
        }
    };

    // Apply filters to bookings
    const filteredBookings = bookings.filter(booking => {
        // Filter by search term
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            const service = services.find(s => s.id === booking.serviceId);
            const serviceName = service ? service.name : booking.serviceName || '';

            const matchesSearch =
                booking.customerName?.toLowerCase().includes(searchTerm) ||
                booking.customerPhone?.toLowerCase().includes(searchTerm) ||
                booking.customerEmail?.toLowerCase().includes(searchTerm) ||
                serviceName.toLowerCase().includes(searchTerm) ||
                booking.id.toLowerCase().includes(searchTerm);

            if (!matchesSearch) return false;
        }

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
        } else if (filters.dateRange === 'custom' && (dateFilter.startDate || dateFilter.endDate)) {
            const bookingDate = new Date(booking.dateTime);
            bookingDate.setHours(0, 0, 0, 0);

            if (dateFilter.startDate) {
                const startDate = new Date(dateFilter.startDate);
                if (bookingDate < startDate) return false;
            }

            if (dateFilter.endDate) {
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (bookingDate > endDate) return false;
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
                        onUpdateStatus={handleUpdateStatus}
                    />
                );
            case 'details':
                return (
                    <BookingDetails
                        booking={selectedBooking}
                        serviceName={getServiceName(selectedBooking?.serviceId)}
                        onBack={() => setView(filters.dateRange === 'today' ? 'calendar' : 'list')}
                        onUpdateStatus={handleUpdateStatus}
                        onReschedule={(bookingId) => {
                            setRescheduleData({
                                ...rescheduleData,
                                bookingId
                            });
                            setIsRescheduling(true);
                        }}
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
                        <button
                            className="export-btn"
                            onClick={exportToCSV}
                            disabled={isExporting || filteredBookings.length === 0}
                        >
                            <Download size={18} />
                            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                        </button>
                    </div>
                </div>
            )}

            {view !== 'details' && (
                <>
                    <div id="booking-stats">
                        <div className="stat-card">
                            <div className="stat-icon today">
                                <Calendar size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.today}</div>
                                <div className="stat-label">Today</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon pending">
                                <Clock size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.pending}</div>
                                <div className="stat-label">Pending</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon confirmed">
                                <Check size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.confirmed}</div>
                                <div className="stat-label">Confirmed</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon completed">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.completed}</div>
                                <div className="stat-label">Completed</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon cancelled">
                                <X size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.cancelled}</div>
                                <div className="stat-label">Cancelled</div>
                            </div>
                        </div>
                    </div>

                    <div className="booking-filters">
                        <div className="filter-group search-filter">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search bookings..."
                                value={filters.searchTerm}
                                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                className="search-input"
                            />
                        </div>

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
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {filters.dateRange === 'custom' && (
                            <div className="date-range-filters">
                                <div className="filter-group date-filter">
                                    <label>From:</label>
                                    <input
                                        type="date"
                                        value={dateFilter.startDate || ''}
                                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                                        className="date-input"
                                    />
                                </div>
                                <div className="filter-group date-filter">
                                    <label>To:</label>
                                    <input
                                        type="date"
                                        value={dateFilter.endDate || ''}
                                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                                        className="date-input"
                                    />
                                </div>
                            </div>
                        )}

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

                        <button
                            className="reset-filters-btn"
                            onClick={() => {
                                setFilters({
                                    status: 'all',
                                    dateRange: 'upcoming',
                                    service: 'all',
                                    searchTerm: ''
                                });
                                setDateFilter({
                                    startDate: null,
                                    endDate: null
                                });
                            }}
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>
                </>
            )}

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading bookings...</p>
                </div>
            ) : (
                renderContent()
            )}

            {isRescheduling && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Reschedule Booking</h3>
                            <button
                                className="close-btn"
                                onClick={() => setIsRescheduling(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>New Date</label>
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
                                <label>New Time</label>
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
                                <label>Reason (optional)</label>
                                <textarea
                                    value={rescheduleData.reason}
                                    onChange={(e) => setRescheduleData({
                                        ...rescheduleData,
                                        reason: e.target.value
                                    })}
                                    className="form-control"
                                    placeholder="Reason for rescheduling"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setIsRescheduling(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleReschedule}
                            >
                                Reschedule Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default EnhancedBookingManagement;
