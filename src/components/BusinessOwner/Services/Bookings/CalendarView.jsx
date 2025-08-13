import React, { useState, useEffect } from 'react';
import { Calendar as CalendarComponent, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Clock, User, MapPin, AlertCircle } from 'lucide-react';

// Set up the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const CalendarView = ({ bookings, services, onViewBooking, businessData }) => {
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dayViewBookings, setDayViewBookings] = useState([]);

    // Convert bookings to calendar events
    useEffect(() => {
        if (bookings && bookings.length > 0) {
            const calendarEvents = bookings.map(booking => {
                // Find the service to get the duration
                const service = services.find(s => s.id === booking.serviceId);
                const duration = service ? service.duration : 60; // Default to 60 minutes if not found

                // Calculate end time based on start time and duration
                const startDate = new Date(booking.dateTime);
                const endDate = new Date(startDate.getTime() + duration * 60000);

                // Set color based on booking status
                let backgroundColor;
                switch (booking.status) {
                    case 'pending':
                        backgroundColor = '#FFC107'; // amber
                        break;
                    case 'confirmed':
                        backgroundColor = '#4CAF50'; // green
                        break;
                    case 'completed':
                        backgroundColor = '#2196F3'; // blue
                        break;
                    case 'cancelled':
                        backgroundColor = '#F44336'; // red
                        break;
                    case 'rescheduled':
                        backgroundColor = '#9C27B0'; // purple
                        break;
                    default:
                        backgroundColor = '#607D8B'; // blue-grey
                }

                // Get service name
                const serviceName = service ? service.name : 'Unknown Service';

                return {
                    id: booking.id,
                    title: `${booking.customerName} - ${serviceName}`,
                    start: startDate,
                    end: endDate,
                    booking: booking,
                    backgroundColor
                };
            });

            setEvents(calendarEvents);
            updateDayViewBookings(selectedDate, calendarEvents);
        } else {
            setEvents([]);
            setDayViewBookings([]);
        }
    }, [bookings, services, selectedDate]);

    // Update the day view bookings when date changes
    const updateDayViewBookings = (date, eventsArray = events) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const filteredBookings = eventsArray
            .filter(event =>
                event.start >= startOfDay &&
                event.start <= endOfDay
            )
            .map(event => event.booking)
            .sort((a, b) => a.dateTime - b.dateTime);

        setDayViewBookings(filteredBookings);
    };

    // Handle date selection in calendar
    const handleSelectDate = (date) => {
        setSelectedDate(date);
        updateDayViewBookings(date);
    };

    // Custom event component for the calendar
    const EventComponent = ({ event }) => (
        <div
            style={{
                backgroundColor: event.backgroundColor,
                color: 'white',
                padding: '2px 5px',
                borderRadius: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                height: '100%',
                display: 'flex',
                alignItems: 'center'
            }}
            onClick={() => onViewBooking(event.booking)}
        >
            {event.title}
        </div>
    );

    // Custom toolbar for the calendar
    const CustomToolbar = (toolbar) => {
        const goToBack = () => {
            toolbar.date.setMonth(toolbar.date.getMonth() - 1);
            toolbar.onNavigate('prev');
        };

        const goToNext = () => {
            toolbar.date.setMonth(toolbar.date.getMonth() + 1);
            toolbar.onNavigate('next');
        };

        const goToToday = () => {
            toolbar.onNavigate('today');
            setSelectedDate(new Date());
        };

        return (
            <div className="calendar-toolbar">
                <div className="toolbar-buttons">
                    <button onClick={goToToday} className="toolbar-btn today-btn">Today</button>
                    <button onClick={goToBack} className="toolbar-btn nav-btn">←</button>
                    <button onClick={goToNext} className="toolbar-btn nav-btn">→</button>
                </div>
                <h3 className="toolbar-label">{toolbar.label}</h3>
                <div className="toolbar-views">
                    <button
                        onClick={() => toolbar.onView('month')}
                        className={`toolbar-btn view-btn ${toolbar.view === 'month' ? 'active' : ''}`}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => toolbar.onView('week')}
                        className={`toolbar-btn view-btn ${toolbar.view === 'week' ? 'active' : ''}`}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => toolbar.onView('day')}
                        className={`toolbar-btn view-btn ${toolbar.view === 'day' ? 'active' : ''}`}
                    >
                        Day
                    </button>
                </div>
            </div>
        );
    };

    // Format booking time
    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get service details
    const getServiceDetails = (serviceId) => {
        return services.find(s => s.id === serviceId) || {};
    };

    // Status badge component
    const StatusBadge = ({ status }) => {
        let className, icon;

        switch (status) {
            case 'pending':
                className = 'status-pending';
                icon = <AlertCircle size={14} />;
                break;
            case 'confirmed':
                className = 'status-confirmed';
                icon = <Clock size={14} />;
                break;
            case 'completed':
                className = 'status-completed';
                icon = <Clock size={14} />;
                break;
            case 'cancelled':
                className = 'status-cancelled';
                icon = <Clock size={14} />;
                break;
            default:
                className = 'status-other';
                icon = <Clock size={14} />;
        }

        return (
            <span className={`status-badge ${className}`}>
                {icon}
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </span>
        );
    };

    return (
        <div className="calendar-view-container">
            <div className="calendar-and-day-view">
                <div className="calendar-container">
                    <CalendarComponent
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 600 }}
                        onSelectEvent={(event) => onViewBooking(event.booking)}
                        onSelectSlot={({ start }) => handleSelectDate(start)}
                        selectable
                        components={{
                            event: EventComponent,
                            toolbar: CustomToolbar
                        }}
                        views={['month', 'week', 'day']}
                        formats={{
                            timeGutterFormat: (date, culture, localizer) =>
                                localizer.format(date, 'h:mm A', culture),
                            eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                                `${localizer.format(start, 'h:mm A', culture)} - ${localizer.format(end, 'h:mm A', culture)}`
                        }}
                    />
                </div>

                <div className="day-view-container">
                    <div className="day-view-header">
                        <h3>{moment(selectedDate).format('dddd, MMMM D, YYYY')}</h3>
                        <div className="day-bookings-count">
                            {dayViewBookings.length} {dayViewBookings.length === 1 ? 'booking' : 'bookings'}
                        </div>
                    </div>

                    <div className="day-bookings-list">
                        {dayViewBookings.length === 0 ? (
                            <div className="no-bookings">
                                <p>No bookings for this day</p>
                            </div>
                        ) : (
                            dayViewBookings.map(booking => {
                                const service = getServiceDetails(booking.serviceId);

                                return (
                                    <div
                                        key={booking.id}
                                        className="day-booking-item"
                                        onClick={() => onViewBooking(booking)}
                                    >
                                        <div className="booking-time">
                                            {formatTime(booking.dateTime)}
                                        </div>
                                        <div className="booking-details">
                                            <div className="booking-customer">
                                                <User size={14} />
                                                <span>{booking.customerName}</span>
                                            </div>
                                            <div className="booking-service">{service.name}</div>
                                            <StatusBadge status={booking.status} />
                                        </div>
                                        <div className="booking-duration">
                                            <Clock size={14} />
                                            <span>{service.duration} min</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="legend-container">
                <h4>Booking Status Legend:</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#FFC107' }}></div>
                        <span>Pending</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span>Confirmed</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                        <span>Completed</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
                        <span>Cancelled</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#9C27B0' }}></div>
                        <span>Rescheduled</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
