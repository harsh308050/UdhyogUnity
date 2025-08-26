import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock } from 'react-feather';
import { getCallHistory } from '../../Firebase/callsDb';
import './CallHistory.css';

const CallHistory = ({ userId, userType = 'customer' }) => {
    const [callHistory, setCallHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadCallHistory();
        }
    }, [userId]);

    const loadCallHistory = async () => {
        try {
            setLoading(true);
            const history = await getCallHistory(userId, 10);
            setCallHistory(history);
        } catch (error) {
            console.error('Error loading call history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCallTime = (timestamp) => {
        if (!timestamp) return '';

        const callTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - callTime) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return `${Math.floor((now - callTime) / (1000 * 60))}m ago`;
        } else if (diffInHours < 24) {
            return callTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return callTime.toLocaleDateString();
        }
    };

    const getCallIcon = (call) => {
        const isVideo = call.type === 'video';
        const IconComponent = isVideo ? Video : Phone;

        if (call.status === 'rejected' || call.status === 'ended' && call.direction === 'incoming') {
            return <PhoneMissed size={16} className="call-icon missed" />;
        } else if (call.direction === 'incoming') {
            return <PhoneIncoming size={16} className="call-icon incoming" />;
        } else {
            return <PhoneOutgoing size={16} className="call-icon outgoing" />;
        }
    };

    const getCallStatusText = (call) => {
        if (call.status === 'rejected') return 'Declined';
        if (call.status === 'ended') return 'Ended';
        if (call.status === 'active') return 'Active';
        return 'Missed';
    };

    const getOtherParty = (call) => {
        return userType === 'customer' ? call.receiverId : call.callerId;
    };

    if (loading) {
        return (
            <div className="call-history-loading">
                <Clock size={20} />
                <span>Loading call history...</span>
            </div>
        );
    }

    if (callHistory.length === 0) {
        return (
            <div className="call-history-empty">
                <Phone size={24} />
                <p>No call history</p>
            </div>
        );
    }

    return (
        <div className="call-history">
            <div className="call-history-header">
                <h4>Recent Calls</h4>
            </div>
            <div className="call-history-list">
                {callHistory.map(call => (
                    <div key={call.id} className={`call-history-item ${call.status}`}>
                        <div className="call-icon-container">
                            {getCallIcon(call)}
                        </div>
                        <div className="call-details">
                            <div className="call-party">
                                {getOtherParty(call)}
                            </div>
                            <div className="call-info">
                                <span className="call-type">{call.type} call</span>
                                <span className="call-status">{getCallStatusText(call)}</span>
                            </div>
                        </div>
                        <div className="call-time">
                            {formatCallTime(call.createdAt)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CallHistory;
