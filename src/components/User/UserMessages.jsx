import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, Phone, Video, MoreVertical, Paperclip, Smile, Plus, Check, Clock } from 'react-feather';
import './UserMessages.css';
import { useAuth } from '../../context/AuthContext';
import CallWindow from './CallWindow';
import {
    getUserConversations,
    listenToConversations,
    listenToMessages,
    sendMessage,
    markMessagesAsRead,
    initializeConversation,
    searchConversations,
    getUnreadMessageCount,
    searchBusinessesForMessaging,
    startConversationWithBusiness
} from '../../Firebase/messageDb';
import { listenToIncomingCalls, updateCallStatus, createCall } from '../../Firebase/callsDb';
import { playRingtone, stopRingtone, showCallNotification, requestNotificationPermission } from '../../utils/callUtils';

function UserMessages() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [lastSentMessageTime, setLastSentMessageTime] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [businessSearchResults, setBusinessSearchResults] = useState([]);
    const [showBusinessSearch, setShowBusinessSearch] = useState(false);
    const [searchingBusinesses, setSearchingBusinesses] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callNotification, setCallNotification] = useState(null);
    const messagesEndRef = useRef(null);
    const unsubscribeConversations = useRef(null);
    const unsubscribeMessages = useRef(null);
    const unsubCalls = useRef(null);
    const ringtoneRef = useRef(null);

    const { currentUser } = useAuth();
    const [activeCall, setActiveCall] = useState(null);

    useEffect(() => {
        console.log('🚀 UserMessages useEffect triggered');

        // Request notification permission
        requestNotificationPermission();

        if (currentUser?.email) {
            console.log('✅ User Email found:', currentUser.email);
            loadConversations();
            setupConversationsListener();
            loadUnreadCount();
            setupIncomingCallListener();
        }

        return () => {
            // Cleanup listeners
            if (unsubscribeConversations.current) {
                unsubscribeConversations.current();
            }
            if (unsubscribeMessages.current) {
                unsubscribeMessages.current();
            }
            if (unsubCalls.current) {
                unsubCalls.current();
            }
            // Stop ringtone
            if (ringtoneRef.current) {
                stopRingtone(ringtoneRef.current);
            }
            // Clear notifications
            if (callNotification) {
                callNotification.close();
            }
        };
    }, [currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedConversation && currentUser?.email) {
            setupMessagesListener();
            // Mark messages as read when conversation is selected
            markMessagesAsRead(
                selectedConversation.customerId,
                selectedConversation.businessId,
                currentUser.email
            );
        }

        return () => {
            if (unsubscribeMessages.current) {
                unsubscribeMessages.current();
            }
        };
    }, [selectedConversation, currentUser]);

    const loadConversations = async () => {
        if (!currentUser?.email) {
            console.log('❌ No current user email available');
            return;
        }

        setLoading(true);
        try {
            console.log('🔄 Loading conversations for customer:', currentUser.email);
            const userConversations = await getUserConversations(currentUser.email, 'customer');
            console.log('📋 Retrieved conversations:', userConversations);
            setConversations(userConversations);

            if (userConversations.length > 0 && !selectedConversation) {
                console.log('🎯 Auto-selecting first conversation:', userConversations[0]);
                setSelectedConversation(userConversations[0]);
            } else if (userConversations.length === 0) {
                console.log('📭 No conversations found for user');
            }
        } catch (error) {
            console.error("❌ Error loading conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const setupConversationsListener = () => {
        if (!currentUser?.email) {
            console.log('❌ Cannot setup listener: No current user email');
            return;
        }

        console.log('👂 Setting up conversations real-time listener for:', currentUser.email);
        unsubscribeConversations.current = listenToConversations(
            currentUser.email,
            'customer',
            (updatedConversations) => {
                console.log('📬 Real-time conversations update received:', updatedConversations.length, 'conversations');
                console.log('📬 Conversations data:', updatedConversations);
                setConversations(updatedConversations);
                loadUnreadCount(); // Update unread count

                // If no conversation is selected and we have conversations, select the first one
                if (updatedConversations.length > 0 && !selectedConversation) {
                    console.log('🎯 Auto-selecting conversation from listener update');
                    setSelectedConversation(updatedConversations[0]);
                }
            }
        );
    };

    const setupMessagesListener = () => {
        if (!selectedConversation || !currentUser?.email) return;

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

    const loadUnreadCount = async () => {
        if (!currentUser?.email) return;

        try {
            const count = await getUnreadMessageCount(currentUser.email, 'customer');
            setUnreadCount(count);
        } catch (error) {
            console.error("❌ Error loading unread count:", error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Call-related functions
    const setupIncomingCallListener = () => {
        if (!currentUser?.email) {
            console.log('❌ Cannot setup call listener: No current user email');
            return;
        }

        console.log('📞 Setting up incoming call listener for user:', currentUser.email);
        unsubCalls.current = listenToIncomingCalls(currentUser.email, (callData) => {
            console.log('📞 Incoming call received:', callData);

            if (callData && callData.status === 'ringing') {
                // Get caller name (business name or email)
                const callerName = callData.callerName || callData.callerId || 'Unknown Business';

                setIncomingCall(callData);

                // Play ringtone
                ringtoneRef.current = playRingtone();

                // Show browser notification
                const notification = showCallNotification(callerName, callData.type);
                setCallNotification(notification);

                console.log(`📞 Incoming ${callData.type} call from ${callerName}`);
            }
        });
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        console.log('✅ Accepting incoming call:', incomingCall.id);

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
            otherUserName: incomingCall.callerName || incomingCall.callerId,
            type: incomingCall.type,
            isIncoming: true
        });

        setIncomingCall(null);
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;

        console.log('❌ Rejecting incoming call:', incomingCall.id);

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

    const handleStartCall = async (type) => {
        if (!selectedConversation || !currentUser?.email) return;

        console.log(`📞 Starting ${type} call to:`, selectedConversation.businessId);

        setActiveCall({
            otherUserId: selectedConversation.businessId,
            otherUserName: selectedConversation.businessName || selectedConversation.businessId,
            type,
            isIncoming: false
        });
    };

    const handleCallEnd = (reason) => {
        console.log('📞 Call ended:', reason);
        setActiveCall(null);

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

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !currentUser?.email || sendingMessage) return;

        setSendingMessage(true);
        const sendTime = new Date();
        setLastSentMessageTime(sendTime);

        try {
            const messageData = {
                senderId: currentUser.email,
                receiverId: selectedConversation.businessId,
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
            // Clear the sending state after a brief delay
            setTimeout(() => setLastSentMessageTime(null), 3000);
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

        // Mark messages as read for this conversation
        if (currentUser?.email) {
            await markMessagesAsRead(
                conversation.customerId,
                conversation.businessId,
                currentUser.email
            );
        }
    };

    const handleSearch = async (searchValue) => {
        setSearchTerm(searchValue);

        if (!currentUser?.email) return;

        try {
            if (searchValue.trim() === '') {
                // Reset search - show existing conversations only
                loadConversations();
                setBusinessSearchResults([]);
                setShowBusinessSearch(false);
            } else {
                console.log('🔍 Searching conversations for:', searchValue);

                // Search existing conversations
                const conversationResults = await searchConversations(currentUser.email, 'customer', searchValue);
                setConversations(conversationResults);

                // Get all existing conversation business emails
                const allConversations = await getUserConversations(currentUser.email, 'customer');
                const existingBusinessEmails = new Set(allConversations.map(conv => conv.businessId));

                // Also search for businesses to start new conversations
                setSearchingBusinesses(true);
                const businessResults = await searchBusinessesForMessaging(searchValue);

                // Filter out businesses that already have conversations
                const newBusinessResults = businessResults.filter(business =>
                    !existingBusinessEmails.has(business.email)
                );

                setBusinessSearchResults(newBusinessResults);
                setShowBusinessSearch(newBusinessResults.length > 0);
                setSearchingBusinesses(false);

                // If there are existing conversations found, auto-select the first one if none is selected
                if (conversationResults.length > 0 && !selectedConversation) {
                    setSelectedConversation(conversationResults[0]);
                }
            }
        } catch (error) {
            console.error("❌ Error searching:", error);
            setSearchingBusinesses(false);
        }
    };

    const handleStartConversationWithBusiness = async (business) => {
        if (!currentUser?.email) return;

        try {
            console.log('🆕 Starting conversation with business:', business.email);

            // Start conversation using the imported function
            await startConversationWithBusiness(
                currentUser.email,
                business.email,
                `Hi! I'd like to know more about your services.`,
                business.businessName || 'Business'
            );

            // Clear search and reload conversations
            setSearchTerm('');
            setBusinessSearchResults([]);
            setShowBusinessSearch(false);
            loadConversations();

            console.log('✅ Conversation started successfully');
        } catch (error) {
            console.error("❌ Error starting conversation:", error);
            alert('Failed to start conversation. Please try again.');
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

    // Function to render message status icons
    const renderMessageStatus = (message) => {
        if (message.senderId !== currentUser?.email) {
            return null; // Don't show status for received messages
        }

        // Check if this message is currently being sent
        const messageTime = new Date(message.timestamp);
        const isRecentMessage = lastSentMessageTime &&
            Math.abs(messageTime - lastSentMessageTime) < 2000; // Within 2 seconds
        const isSending = sendingMessage && isRecentMessage;

        if (isSending) {
            return (
                <div className="message-status sending">
                    <Clock size={12} color='white' />
                </div>
            );
        }

        if (message.isRead) {
            return (
                <div className="message-status read" title="Read">
                    <Check size={14} color='white' />
                    <Check size={14} className="second-tick" color='white' />
                </div>
            );
        } else {
            return (
                <div className="message-status delivered" title="Delivered">
                    <Check size={14} color='white' />
                    <Check size={14} className="second-tick" color='white' />
                </div>
            );
        }
    };

    // Debug function to check what's in Firestore
    const debugFirestore = async () => {
        if (!currentUser?.email) return;

        console.log('🔍 Starting Firestore debug for user:', currentUser.email);

        try {
            // Import necessary Firestore functions for debugging
            const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
            const { db } = await import('../../Firebase/config');

            // Try to get ALL conversations first
            console.log('📋 Getting ALL conversations from Messages collection...');
            const allConversationsRef = collection(db, "Messages");
            const allSnapshot = await getDocs(allConversationsRef);

            console.log(`📊 Total conversations in database: ${allSnapshot.size}`);
            allSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`📄 Conversation ${doc.id}:`, {
                    customerId: data.customerId,
                    businessId: data.businessId,
                    customerName: data.customerName,
                    businessName: data.businessName,
                    lastMessage: data.lastMessage,
                    lastTimestamp: data.lastTimestamp
                });
            });

            // Now try the specific query for this user
            console.log('🎯 Trying user-specific query...');

            // First try simple query without orderBy
            const simpleQuery = query(
                allConversationsRef,
                where("customerId", "==", currentUser.email)
            );

            const simpleSnapshot = await getDocs(simpleQuery);
            console.log(`👤 Simple query results: ${simpleSnapshot.size} conversations`);

            if (simpleSnapshot.size > 0) {
                console.log('✅ Simple query works! Index might be missing for orderBy.');
                console.log('🚨 CREATE FIRESTORE INDEX:');
                console.log('Collection: Messages');
                console.log('Fields: customerId (Ascending), lastTimestamp (Descending)');
            }

            // Now try with orderBy to check for index
            try {
                const userQuery = query(
                    allConversationsRef,
                    where("customerId", "==", currentUser.email),
                    orderBy("lastTimestamp", "desc")
                );

                const userSnapshot = await getDocs(userQuery);
                console.log(`👤 OrderBy query results: ${userSnapshot.size} conversations`);
                console.log('✅ OrderBy query works! Index exists.');
            } catch (indexError) {
                console.error('❌ OrderBy query failed (index missing):', indexError);
                console.log('🚨 FIRESTORE INDEX REQUIRED:');
                console.log('Collection: Messages');
                console.log('Fields: customerId (Ascending), lastTimestamp (Descending)');
                console.log('👆 Create this index in Firebase Console > Firestore > Indexes');
            }

        } catch (error) {
            console.error('❌ Debug error:', error);
        }
    };

    if (loading) {
        return (
            <div className="user-messages">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-messages">
            <div className="messages-container">
                {/* Conversations Sidebar */}
                <div className="conversations-sidebar">
                    <div className="sidebar-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2>Messages {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}</h2>
                        </div>
                        <div className="search-conversations">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations or businesses..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="conversations-list">
                        {/* Show business search results when searching */}
                        {showBusinessSearch && searchTerm.trim() && (
                            <>
                                <div className="search-section-header">
                                    <h4>Start New Conversation</h4>
                                    {searchingBusinesses && <div className="search-loading">Searching...</div>}
                                </div>
                                {businessSearchResults.map(business => (
                                    <div
                                        key={business.id}
                                        className="business-search-item"
                                        onClick={() => handleStartConversationWithBusiness(business)}
                                    >
                                        <div className="conversation-avatar">
                                            <h5>{(business.businessName || 'B').charAt(0)}</h5>
                                        </div>
                                        <div className="conversation-content">
                                            <div className="conversation-header">
                                                <h4>{business.businessName || 'Unknown Business'}</h4>
                                            </div>
                                            <div className="conversation-preview">
                                                <p>{business.businessType || 'Business'} • Click to start conversation</p>
                                            </div>
                                        </div>
                                        <div className="start-chat-icon">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                ))}
                                {businessSearchResults.length > 0 && conversations.length > 0 && (
                                    <div className="search-divider">
                                        <hr />
                                        <span>Existing Conversations</span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Show helpful message when search finds no new businesses but has existing conversations */}
                        {searchTerm.trim() && !showBusinessSearch && conversations.length > 0 && (
                            <div className="search-info-message">
                                <MessageSquare size={20} />
                                <p>Found existing conversation{conversations.length > 1 ? 's' : ''} for "{searchTerm}"</p>
                            </div>
                        )}

                        {/* Existing conversations */}
                        {conversations.length > 0 ? (
                            <>
                                {searchTerm.trim() && (
                                    <div className="search-section-header">
                                        <h4>Your Conversations</h4>
                                    </div>
                                )}
                                {conversations.map(conversation => (
                                    <div
                                        key={conversation.id}
                                        className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''} ${searchTerm.trim() ? 'search-result' : ''}`}
                                        onClick={() => handleConversationSelect(conversation)}
                                    >
                                        <div className="conversation-avatar">
                                            <h5>{conversation.businessName.charAt(0)}</h5>
                                        </div>

                                        <div className="conversation-content">
                                            <div className="conversation-header">
                                                <h4>{conversation.businessName}</h4>
                                                <span className="time">{formatTime(conversation.lastTimestamp)}</span>
                                            </div>
                                            <div className="conversation-preview">
                                                <p>{conversation.lastMessage || 'No messages yet'}</p>
                                                {conversation.customerUnreadCount > 0 && (
                                                    <div className="unread-badge">
                                                        {conversation.customerUnreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {searchTerm.trim() && (
                                            <div className="existing-conversation-indicator">
                                                <MessageSquare size={14} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        ) : (
                            !showBusinessSearch && (
                                <div className="no-conversations">
                                    <MessageSquare size={48} />
                                    {searchTerm.trim() ? (
                                        <>
                                            <p>No results found for "{searchTerm}"</p>
                                            <small>Try searching with a different business name or email</small>
                                        </>
                                    ) : (
                                        <>
                                            <p>No conversations yet</p>
                                            <small>Start a conversation by contacting a business</small>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="chat-area">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header">
                                <div className="chat-business-info">

                                    <div className="business-details">
                                        <h3>{selectedConversation.businessName}</h3>
                                        <p className="business-status">
                                            Business
                                        </p>
                                    </div>
                                </div>

                                <div className="chat-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleStartCall('voice')}
                                        title="Voice Call"
                                    >
                                        <Phone size={18} />
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleStartCall('video')}
                                        title="Video Call"
                                    >
                                        <Video size={18} />
                                    </button>
                                    <button className="action-btn">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="messages-area">
                                {messages.length > 0 ? (
                                    messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`message ${message.senderId === currentUser?.email ? 'sent' : 'received'}`}
                                        >
                                            <div className="message-content">
                                                <p>{message.text}</p>
                                                <div className="message-meta">
                                                    <span className="message-time">
                                                        {formatTime(message.timestamp)}
                                                    </span>
                                                    {/* Show read receipts only for sent messages */}
                                                    {renderMessageStatus(message)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-conversation-selected">
                                        <MessageSquare size={64} />
                                        <h3>Start the conversation</h3>
                                        <p>Send a message to {selectedConversation.businessName}</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="message-input-area">
                                <div className="message-input-container">
                                    <div className="input-wrapper">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type a message..."
                                            rows="1"
                                            disabled={sendingMessage}
                                        />
                                        <button className="emoji-btn">
                                            <Smile size={18} />
                                        </button>
                                    </div>

                                    <button
                                        className="send-btn"
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sendingMessage}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-conversation-selected">
                            <MessageSquare size={64} />
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
                        </div>
                    )}
                </div>
                {activeCall && (
                    <CallWindow
                        currentUser={currentUser}
                        otherUserId={activeCall.otherUserId}
                        otherUserName={activeCall.otherUserName || 'Business'}
                        currentUserName={currentUser?.displayName || currentUser?.email}
                        type={activeCall.type}
                        callId={activeCall.callId}
                        onClose={handleCallEnd}
                    />
                )}

                {/* Incoming Call Popup */}
                {incomingCall && (
                    <div className="incoming-call-overlay">
                        <div className="incoming-call-popup">
                            <div className="incoming-call-header">
                                <h3>{incomingCall.callerName || incomingCall.callerId}</h3>
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
            </div>
        </div>
    );
}

export default UserMessages;
