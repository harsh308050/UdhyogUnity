import React from 'react';
import EnhancedUserBookings from './EnhancedUserBookings';
import LegacyUserBookings from './LegacyUserBookings';

// Import this file instead of directly importing UserBookings
// This allows us to easily switch between the legacy and enhanced versions

// Set this to true to use the enhanced version, false to use the legacy version
const USE_ENHANCED_BOOKINGS = true;

const UserBookings = () => {
    if (USE_ENHANCED_BOOKINGS) {
        return <EnhancedUserBookings />;
    } else {
        return <LegacyUserBookings />;
    }
};

export default UserBookings;
