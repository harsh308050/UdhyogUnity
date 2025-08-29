import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, Phone, Video, MoreVertical, Paperclip, Smile, ArrowLeft } from 'react-feather';
import './BusinessMessages.css';
import './BusinessMessagesCalls.css';
import { getCurrentBusinessEmail } from '../../../Firebase/getBusinessData';
import {
    getUserConversations,
    listenToConversations,
    listenToMessages,
    sendMessage,
    markMessagesAsRead,
    searchConversations,
    getUnreadMessageCount
} from '../../../Firebase/messageDb';
import { listenToIncomingCalls, updateCallStatus } from '../../../Firebase/callsDb';
import { playRingtone, stopRingtone, showCallNotification, requestNotificationPermission } from '../../../utils/callUtils';
import CallWindow from '../../User/CallWindow';

function BusinessMessages() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [businessEmail, setBusinessEmail] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callNotification, setCallNotification] = useState(null);
    const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef(null);
    const mobileMessagesEndRef = useRef(null);
    const unsubCalls = useRef(null);
    const unsubscribeConversations = useRef(null);
    const unsubscribeMessages = useRef(null);
    const ringtoneRef = useRef(null);

    useEffect(() => {
        console.log('🚀 BusinessMessages useEffect triggered');

        // Check if device is mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Request notification permission
        requestNotificationPermission();

        // Get business email from session storage (same as BusinessDashboard)
        const email = getCurrentBusinessEmail();
        console.log('🔐 Business Email from session:', email);

        if (email) {
            console.log('✅ Business Email found:', email);
            setBusinessEmail(email);
            loadConversations(email);
            setupConversationsListener(email);
            loadUnreadCount(email);
            // listen for incoming calls and keep ref for cleanup
            unsubCalls.current = listenToIncomingCalls(email, (callDoc) => {
                console.log('Incoming call:', callDoc);

                // Don't show incoming call popup if there's already an active call or incoming call
                if (activeCall || incomingCall) {
                    console.log('⚠️ Ignoring incoming call - already in call or handling incoming call');
                    return;
                }

                setIncomingCall(callDoc);

                // Play ringtone
                ringtoneRef.current = playRingtone();

                // Show browser notification
                const callerName = conversations.find(conv => conv.customerId === callDoc.callerId)?.customerName || 'Unknown Caller';
                const notification = showCallNotification(callerName, callDoc.type);
                setCallNotification(notification);
            });
        } else {
            console.log('❌ No business email found in session');
            setBusinessEmail(null);
            setLoading(false);
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
            // Cleanup all listeners
            unsubCalls.current && unsubCalls.current();
            if (unsubscribeConversations.current) {
                unsubscribeConversations.current();
            }
            if (unsubscribeMessages.current) {
                unsubscribeMessages.current();
            }
            // Stop ringtone and close notification
            if (ringtoneRef.current) {
                stopRingtone(ringtoneRef.current);
            }
            if (callNotification) {
                callNotification.close();
            }
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
        // Also scroll mobile messages if dialog is open
        if (isMobileDialogOpen && mobileMessagesEndRef.current) {
            mobileMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMobileDialogOpen]);

    useEffect(() => {
        if (selectedConversation && businessEmail) {
            setupMessagesListener();
            // Mark messages as read when conversation is selected
            markMessagesAsRead(
                selectedConversation.customerId,
                selectedConversation.businessId,
                businessEmail
            );
        }

        return () => {
            if (unsubscribeMessages.current) {
                unsubscribeMessages.current();
            }
        };
    }, [selectedConversation, businessEmail]);

    const loadConversations = async (email) => {
        console.log('📞 loadConversations called with email:', email);
        if (!email) {
            console.log('❌ No business email available');
            return;
        }

        setLoading(true);
        console.log('⏳ Setting loading to true');
        try {
            console.log('🔄 Loading conversations for business:', email);
            const businessConversations = await getUserConversations(email, 'business');
            console.log('📋 Retrieved conversations:', businessConversations);
            setConversations(businessConversations);

            if (businessConversations.length > 0 && !selectedConversation) {
                console.log('🎯 Auto-selecting first conversation:', businessConversations[0]);
                setSelectedConversation(businessConversations[0]);
            } else if (businessConversations.length === 0) {
                console.log('📭 No conversations found for business');
            }
        } catch (error) {
            console.error("❌ Error loading conversations:", error);
        } finally {
            console.log('✅ Setting loading to false');
            setLoading(false);
        }
    };

    const setupConversationsListener = (email) => {
        if (!email) {
            console.log('❌ Cannot setup listener: No business email');
            return;
        }

        console.log('👂 Setting up conversations real-time listener for:', email);
        unsubscribeConversations.current = listenToConversations(
            email,
            'business',
            (updatedConversations) => {
                console.log('📬 Real-time conversations update received:', updatedConversations.length, 'conversations');
                console.log('📬 Conversations data:', updatedConversations);
                setConversations(updatedConversations);
                loadUnreadCount(email); // Update unread count

                // If no conversation is selected and we have conversations, select the first one
                if (updatedConversations.length > 0 && !selectedConversation) {
                    console.log('🎯 Auto-selecting conversation from listener update');
                    setSelectedConversation(updatedConversations[0]);
                }
            }
        );
    };

    const setupMessagesListener = () => {
        if (!selectedConversation || !businessEmail) return;

        console.log('👂 Setting up messages real-time listener for:', selectedConversation.chatId);
        unsubscribeMessages.current = listenToMessages(
            selectedConversation.customerId,
            selectedConversation.businessId,
            (updatedMessages) => {
                console.log('📨 Real-time messages update:', updatedMessages.length);
                setMessages(updatedMessages);
            }
        );
    };

    const loadUnreadCount = async (email) => {
        if (!email) return;

        try {
            const count = await getUnreadMessageCount(email, 'business');
            setUnreadCount(count);
        } catch (error) {
            console.error("❌ Error loading unread count:", error);
        }
    };

    // markMessagesAsRead is now handled by the helper function
    // The function signature is: markMessagesAsRead(customerId, businessId, userEmail)
    // This is called in the useEffect above

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !businessEmail || sendingMessage) return;

        setSendingMessage(true);
        try {
            const messageData = {
                senderId: businessEmail,
                receiverId: selectedConversation.customerId,
                text: newMessage.trim(),
                type: 'text'
            };

            console.log('📤 Sending message:', messageData);
            await sendMessage(
                selectedConversation.customerId,
                selectedConversation.businessId,
                messageData
            );

            setNewMessage('');
            console.log('✅ Message sent successfully');
        } catch (error) {
            console.error("❌ Error sending message:", error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleConversationSelect = async (conversation) => {
        console.log('🎯 Selecting conversation:', conversation.chatId);
        setSelectedConversation(conversation);

        // On mobile, open the dialog
        if (isMobile) {
            setIsMobileDialogOpen(true);
        }

        // Mark messages as read for this conversation
        if (businessEmail) {
            await markMessagesAsRead(
                conversation.customerId,
                conversation.businessId,
                businessEmail
            );
        }
    };

    const handleCloseMobileDialog = () => {
        setIsMobileDialogOpen(false);
        // Optionally clear selection on mobile
        // setSelectedConversation(null);
    };

    const handleSearch = async (searchValue) => {
        setSearchTerm(searchValue);

        if (!businessEmail) return;

        try {
            if (searchValue.trim() === '') {
                loadConversations(businessEmail);
            } else {
                console.log('🔍 Searching conversations for:', searchValue);
                const results = await searchConversations(businessEmail, 'business', searchValue);
                setConversations(results);
            }
        } catch (error) {
            console.error("❌ Error searching conversations:", error);
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInHours = (now - messageTime) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return `${Math.floor((now - messageTime) / (1000 * 60))}m ago`;
        } else if (diffInHours < 24) {
            return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return messageTime.toLocaleDateString();
        }
    };

    const handleStartCall = async (type) => {
        if (!selectedConversation || !businessEmail) return;

        console.log(`📞 Business starting ${type} call to:`, selectedConversation.customerId);

        setActiveCall({
            otherUserId: selectedConversation.customerId,
            otherUserName: selectedConversation.customerName || selectedConversation.customerId,
            type,
            isIncoming: false
        });
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        console.log('✅ Business accepting incoming call:', incomingCall.id);

        // Stop ringtone and clear notification
        if (ringtoneRef.current) {
            stopRingtone(ringtoneRef.current);
            ringtoneRef.current = null;
        }
        if (callNotification) {
            callNotification.close();
            setCallNotification(null);
        }

        // Start call window
        setActiveCall({
            callId: incomingCall.id,
            otherUserId: incomingCall.callerId,
            otherUserName: conversations.find(conv => conv.customerId === incomingCall.callerId)?.customerName ||
                incomingCall.callerName || incomingCall.callerId || 'Customer',
            type: incomingCall.type,
            isIncoming: true
        });

        setIncomingCall(null);
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;

        console.log('❌ Business rejecting incoming call:', incomingCall.id);

        // Stop ringtone and clear notification
        if (ringtoneRef.current) {
            stopRingtone(ringtoneRef.current);
            ringtoneRef.current = null;
        }
        if (callNotification) {
            callNotification.close();
            setCallNotification(null);
        }

        // Update call status to rejected
        try {
            await updateCallStatus(incomingCall.id, 'rejected');
        } catch (error) {
            console.error('Failed to update call status:', error);
        }

        setIncomingCall(null);
    };

    const handleCallEnd = (reason) => {
        console.log('📞 Business call ended:', reason);
        setActiveCall(null);

        // Clear any remaining incoming call state
        setIncomingCall(null);

        // Stop ringtone if still playing
        if (ringtoneRef.current) {
            stopRingtone(ringtoneRef.current);
            ringtoneRef.current = null;
        }

        // Clear any remaining notifications
        if (callNotification) {
            callNotification.close();
            setCallNotification(null);
        }
    };

    if (loading) {
        return (
            <div className="business-dashboard-theme business-user-messages">
                <div className="business-loading-container">
                    <div className="business-loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="business-dashboard-theme business-user-messages">
            <div className={`business-messages-container ${isMobile && isMobileDialogOpen ? 'mobile-dialog-active' : ''}`}>
                {/* Conversations Sidebar */}
                <div className="business-conversations-sidebar">
                    <div className="business-sidebar-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2>Messages</h2>
                        </div>
                        <div className="business-search-conversations">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="business-conversations-list">
                        {conversations.length > 0 ? (
                            conversations.map(conversation => (
                                <div
                                    key={conversation.id}
                                    className={`business-conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                                    onClick={() => handleConversationSelect(conversation)}
                                >
                                    <div className="business-conversation-avatar">
                                        <h5>{(conversation.customerName || 'C').charAt(0)}</h5>
                                    </div>

                                    <div className="business-conversation-content">
                                        <div className="business-conversation-header">
                                            <h4>{conversation.customerName || 'Unknown Customer'}</h4>
                                        </div>
                                        <div className="business-conversation-preview">
                                            <p>{conversation.lastMessage || 'No messages yet'}</p>
                                            <span className="business-time">{formatTime(conversation.lastTimestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="business-no-conversations">
                                <MessageSquare size={48} />
                                <p>No conversations yet</p>
                                <small>Customers will appear here when they message you</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="business-chat-area">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="business-chat-header">
                                <div className="business-chat-business-info">
                                    <div className="business-customer-details">
                                        <h3>{selectedConversation.customerName || 'Unknown Customer'}</h3>
                                        <p className="business-customer-status">
                                            Customer
                                        </p>
                                    </div>
                                </div>

                                <div className="business-chat-actions">
                                    <button
                                        className="business-action-btn"
                                        onClick={() => handleStartCall('voice')}
                                        title="Voice Call"
                                    >
                                        <Phone size={18} />
                                    </button>
                                    <button
                                        className="business-action-btn"
                                        onClick={() => handleStartCall('video')}
                                        title="Video Call"
                                    >
                                        <Video size={18} />
                                    </button>
                                    <button className="business-action-btn">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="business-messages-area">
                                {/* Incoming call popup (rendered outside messages list so it's always visible) */}
                                {incomingCall && !activeCall && (
                                    <div className="incoming-call-overlay">
                                        <div className="incoming-call-popup">
                                            <div className="incoming-call-header">
                                                <h3>
                                                    {conversations.find(conv => conv.customerId === incomingCall.callerId)?.customerName ||
                                                        incomingCall.callerName || incomingCall.callerId || 'Unknown Customer'}
                                                </h3>
                                                <p className="call-type">Incoming {incomingCall.type} call</p>
                                            </div>

                                            <div className="incoming-call-avatar">
                                                <div className="avatar-placeholder">
                                                    {incomingCall.type === 'video' ? <Video size={40} /> : <Phone size={40} />}
                                                </div>
                                                <div className="incoming-call-animation">
                                                    <div className="call-pulse"></div>
                                                    <div className="call-pulse"></div>
                                                    <div className="call-pulse"></div>
                                                </div>
                                            </div>

                                            <div className="incoming-call-actions">
                                                <button
                                                    className="call-action-btn accept-btn"
                                                    onClick={handleAcceptCall}
                                                    title="Accept Call"
                                                >
                                                    <Phone size={20} />
                                                    Accept
                                                </button>
                                                <button
                                                    className="call-action-btn reject-btn"
                                                    onClick={handleRejectCall}
                                                    title="Reject Call"
                                                >
                                                    <Phone size={20} />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCall && (
                                    <CallWindow
                                        currentUser={{ email: businessEmail }}
                                        otherUserId={activeCall.otherUserId}
                                        otherUserName={activeCall.otherUserName || 'Customer'}
                                        currentUserName={businessEmail}
                                        type={activeCall.type}
                                        callId={activeCall.callId}
                                        onClose={() => setActiveCall(null)}
                                    />
                                )}

                                {messages.length > 0 ? (
                                    messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`business-message ${message.senderId === businessEmail ? 'sent' : 'received'}`}
                                        >
                                            <div className="business-message-content">
                                                <p>{message.text}</p>
                                                <span className="business-message-time">
                                                    {formatTime(message.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="business-no-conversation-selected">
                                        <MessageSquare size={64} />
                                        <h3>Start the conversation</h3>
                                        <p>Send a message to {selectedConversation.customerName || 'this customer'}</p>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="business-message-input-area">
                                <div className="business-message-input-container">
                                    <div className="business-input-wrapper">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type a message..."
                                            rows="1"
                                            disabled={sendingMessage}
                                        />
                                        <button className="business-emoji-btn">
                                            <Smile size={18} />
                                        </button>
                                    </div>

                                    <button
                                        className="business-send-btn"
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sendingMessage}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="business-no-conversation-selected">
                            <MessageSquare size={64} />
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
                        </div>
                    )}
                </div>

                {/* Mobile Chat Dialog */}
                {isMobile && (
                    <div className={`business-mobile-chat-dialog ${isMobileDialogOpen ? 'active' : ''}`}>
                        {selectedConversation && (
                            <>
                                <div className="business-mobile-chat-header">
                                    <button
                                        className="business-mobile-back-btn"
                                        onClick={handleCloseMobileDialog}
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="business-mobile-chat-info">
                                        <div className="business-mobile-customer-avatar">
                                            {(selectedConversation.customerName || 'C').charAt(0)}
                                        </div>
                                        <div className="business-mobile-customer-details">
                                            <h3>{selectedConversation.customerName || 'Unknown Customer'}</h3>
                                            <p>Customer</p>
                                        </div>
                                    </div>
                                    <div className="business-mobile-chat-actions">
                                        <button
                                            className="business-mobile-action-btn"
                                            onClick={() => handleStartCall('voice')}
                                            title="Voice Call"
                                        >
                                            <Phone size={18} />
                                        </button>
                                        <button
                                            className="business-mobile-action-btn"
                                            onClick={() => handleStartCall('video')}
                                            title="Video Call"
                                        >
                                            <Video size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="business-mobile-messages-area">
                                    {messages.length > 0 ? (
                                        messages.map(message => (
                                            <div
                                                key={message.id}
                                                className={`business-mobile-message ${message.senderId === businessEmail ? 'sent' : 'received'}`}
                                            >
                                                <div className="business-mobile-message-content">
                                                    <p>{message.text}</p>
                                                    <div className="business-mobile-message-meta">
                                                        <span className="business-message-time">
                                                            {formatTime(message.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="business-mobile-no-messages">
                                            <MessageSquare size={48} />
                                            <h3>Start the conversation</h3>
                                            <p>Send a message to {selectedConversation.customerName || 'this customer'}</p>
                                        </div>
                                    )}
                                    <div ref={mobileMessagesEndRef} />
                                </div>

                                <div className="business-mobile-input-area">
                                    <div className="business-mobile-input-container">
                                        <div className="business-mobile-input-wrapper">
                                            <textarea
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Type a message..."
                                                rows="1"
                                                disabled={sendingMessage}
                                            />
                                            <button className="business-mobile-emoji-btn">
                                                <Smile size={18} />
                                            </button>
                                        </div>
                                        <button
                                            className="business-mobile-send-btn"
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim() || sendingMessage}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default BusinessMessages;
