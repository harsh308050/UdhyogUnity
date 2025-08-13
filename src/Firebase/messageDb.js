// src/Firebase/messageDb.js
import {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firebase Collection Structure:
 * 
 * Messages Collection
 * └── CustomerEmail_BusinessEmail (document ID)
 *     ├── chatId: "CustomerEmail_BusinessEmail"
 *     ├── customerId: "CustomerEmail"
 *     ├── businessId: "BusinessEmail"
 *     ├── lastMessage: string
 *     ├── lastTimestamp: timestamp
 *     ├── customerName: string
 *     ├── businessName: string
 *     ├── customerUnreadCount: number
 *     ├── businessUnreadCount: number
 *     └── Chats (subcollection)
 *         ├── msg001
 *         │   ├── senderId: "CustomerEmail" or "BusinessEmail"
 *         │   ├── receiverId: "BusinessEmail" or "CustomerEmail"
 *         │   ├── text: string
 *         │   ├── timestamp: timestamp
 *         │   ├── type: "text" | "image" | "file" | "location"
 *         │   └── isRead: boolean
 *         └── msg002...
 */

// Helper function to create chat ID
export const createChatId = (customerEmail, businessEmail) => {
    return `${customerEmail}_${businessEmail}`;
};

// Helper function to extract emails from chat ID
export const extractEmailsFromChatId = (chatId) => {
    const [customerEmail, businessEmail] = chatId.split('_');
    return { customerEmail, businessEmail };
};

// Initialize or get conversation
export const initializeConversation = async (customerEmail, businessEmail, customerName = '', businessName = '') => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);

        // Check if conversation already exists
        const conversationDoc = await getDoc(conversationRef);

        if (!conversationDoc.exists()) {
            // Create new conversation
            const conversationData = {
                chatId,
                customerId: customerEmail,
                businessId: businessEmail,
                customerName: customerName || customerEmail,
                businessName: businessName || businessEmail,
                lastMessage: '',
                lastTimestamp: serverTimestamp(),
                customerUnreadCount: 0,
                businessUnreadCount: 0,
                createdAt: serverTimestamp()
            };

            await setDoc(conversationRef, conversationData);
            console.log(`✅ Created new conversation: ${chatId}`);

            return conversationData;
        } else {
            console.log(`📋 Conversation exists: ${chatId}`);
            return conversationDoc.data();
        }
    } catch (error) {
        console.error("❌ Error initializing conversation:", error);
        throw error;
    }
};

// Send a message
export const sendMessage = async (customerEmail, businessEmail, messageData) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);
        const chatsRef = collection(conversationRef, "Chats");

        // Prepare message data
        const messageToSend = {
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            text: messageData.text || '',
            timestamp: serverTimestamp(),
            type: messageData.type || 'text',
            isRead: false,
            // Additional fields for different message types
            ...(messageData.imageUrl && { imageUrl: messageData.imageUrl }),
            ...(messageData.fileUrl && { fileUrl: messageData.fileUrl }),
            ...(messageData.fileName && { fileName: messageData.fileName }),
            ...(messageData.location && { location: messageData.location })
        };

        // Add message to Chats subcollection
        const messageRef = await addDoc(chatsRef, messageToSend);
        console.log(`📤 Message sent with ID: ${messageRef.id}`);

        // Get current conversation data to update unread counts
        const conversationDoc = await getDoc(conversationRef);
        const currentData = conversationDoc.exists() ? conversationDoc.data() : {};

        // Update conversation metadata
        const isFromCustomer = messageData.senderId === customerEmail;
        const updateData = {
            lastMessage: messageData.text || '[Media]',
            lastTimestamp: serverTimestamp(),
            // Increment unread count for receiver
            ...(isFromCustomer
                ? { businessUnreadCount: (currentData.businessUnreadCount || 0) + 1 }
                : { customerUnreadCount: (currentData.customerUnreadCount || 0) + 1 }
            )
        };

        await updateDoc(conversationRef, updateData);

        return {
            id: messageRef.id,
            ...messageToSend
        };
    } catch (error) {
        console.error("❌ Error sending message:", error);
        throw error;
    }
};

// Get messages for a conversation with real-time listener
export const listenToMessages = (customerEmail, businessEmail, callback, limitCount = 50) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);
        const chatsRef = collection(conversationRef, "Chats");

        const messagesQuery = query(
            chatsRef,
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );

        console.log(`👂 Setting up real-time listener for: ${chatId}`);

        return onSnapshot(messagesQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            })).reverse(); // Reverse to show oldest first

            console.log(`📨 Received ${messages.length} messages for ${chatId}`);
            callback(messages);
        }, (error) => {
            console.error("❌ Error listening to messages:", error);
            callback([]);
        });
    } catch (error) {
        console.error("❌ Error setting up message listener:", error);
        return () => { }; // Return empty unsubscribe function
    }
};

// Get conversations for a user (customer or business)
export const getUserConversations = async (userEmail, userType = 'customer') => {
    try {
        console.log(`🔍 Fetching conversations for ${userType}: ${userEmail}`);

        const conversationsRef = collection(db, "Messages");
        let conversationsQuery;

        if (userType === 'customer') {
            // Try without orderBy first to check if data exists
            conversationsQuery = query(
                conversationsRef,
                where("customerId", "==", userEmail)
            );
        } else {
            conversationsQuery = query(
                conversationsRef,
                where("businessId", "==", userEmail)
            );
        }

        const querySnapshot = await getDocs(conversationsQuery);
        let conversations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            chatId: doc.id,
            ...doc.data(),
            lastTimestamp: doc.data().lastTimestamp?.toDate() || new Date()
        }));

        // Sort manually since orderBy might require index
        conversations.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));

        console.log(`📋 Found ${conversations.length} conversations for ${userEmail}`);
        return conversations;
    } catch (error) {
        console.error("❌ Error fetching conversations:", error);

        // If it's an index error, try without orderBy
        if (error.message.includes('index') || error.code === 'failed-precondition') {
            console.log('🔄 Retrying without orderBy due to missing index...');
            try {
                const conversationsRef = collection(db, "Messages");
                let simpleQuery;

                if (userType === 'customer') {
                    simpleQuery = query(conversationsRef, where("customerId", "==", userEmail));
                } else {
                    simpleQuery = query(conversationsRef, where("businessId", "==", userEmail));
                }

                const retrySnapshot = await getDocs(simpleQuery);
                const conversations = retrySnapshot.docs.map(doc => ({
                    id: doc.id,
                    chatId: doc.id,
                    ...doc.data(),
                    lastTimestamp: doc.data().lastTimestamp?.toDate() || new Date()
                }));

                // Sort manually
                conversations.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));

                console.log(`📋 Retry successful: Found ${conversations.length} conversations`);
                return conversations;
            } catch (retryError) {
                console.error("❌ Retry also failed:", retryError);
                return [];
            }
        }
        return [];
    }
};

// Listen to conversations for real-time updates
export const listenToConversations = (userEmail, userType = 'customer', callback) => {
    try {
        console.log(`👂 Setting up conversations listener for ${userType}: ${userEmail}`);

        const conversationsRef = collection(db, "Messages");
        let conversationsQuery;

        if (userType === 'customer') {
            // Try simple query first without orderBy to avoid index issues
            conversationsQuery = query(
                conversationsRef,
                where("customerId", "==", userEmail)
            );
        } else {
            conversationsQuery = query(
                conversationsRef,
                where("businessId", "==", userEmail)
            );
        }

        return onSnapshot(conversationsQuery, (snapshot) => {
            let conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                chatId: doc.id,
                ...doc.data(),
                lastTimestamp: doc.data().lastTimestamp?.toDate() || new Date()
            }));

            // Sort manually by timestamp
            conversations.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));

            console.log(`📬 Real-time: ${conversations.length} conversations for ${userEmail}`);
            callback(conversations);
        }, (error) => {
            console.error("❌ Error listening to conversations:", error);

            // If index error, try simpler query
            if (error.message.includes('index') || error.code === 'failed-precondition') {
                console.log('🔄 Switching to simpler real-time query...');

                // Fallback to polling every 5 seconds
                const pollInterval = setInterval(async () => {
                    try {
                        const conversations = await getUserConversations(userEmail, userType);
                        callback(conversations);
                    } catch (pollError) {
                        console.error('❌ Polling error:', pollError);
                    }
                }, 5000);

                // Return cleanup function
                return () => clearInterval(pollInterval);
            }

            callback([]);
        });
    } catch (error) {
        console.error("❌ Error setting up conversations listener:", error);
        return () => { };
    }
};

// Mark messages as read
export const markMessagesAsRead = async (customerEmail, businessEmail, userEmail) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);
        const chatsRef = collection(conversationRef, "Chats");

        // Get unread messages where current user is the receiver
        const unreadQuery = query(
            chatsRef,
            where("receiverId", "==", userEmail),
            where("isRead", "==", false)
        );

        const unreadSnapshot = await getDocs(unreadQuery);

        // Mark all unread messages as read
        const updatePromises = unreadSnapshot.docs.map(doc =>
            updateDoc(doc.ref, { isRead: true })
        );

        await Promise.all(updatePromises);

        // Reset unread count in conversation
        const isCustomer = userEmail === customerEmail;
        const updateData = isCustomer
            ? { customerUnreadCount: 0 }
            : { businessUnreadCount: 0 };

        await updateDoc(conversationRef, updateData);

        console.log(`✅ Marked ${unreadSnapshot.docs.length} messages as read for ${userEmail}`);
        return unreadSnapshot.docs.length;
    } catch (error) {
        console.error("❌ Error marking messages as read:", error);
        return 0;
    }
};

// Get unread message count for a user
export const getUnreadMessageCount = async (userEmail, userType = 'customer') => {
    try {
        const conversations = await getUserConversations(userEmail, userType);

        const totalUnread = conversations.reduce((total, conversation) => {
            return total + (userType === 'customer'
                ? (conversation.customerUnreadCount || 0)
                : (conversation.businessUnreadCount || 0)
            );
        }, 0);

        console.log(`📊 Total unread messages for ${userEmail}: ${totalUnread}`);
        return totalUnread;
    } catch (error) {
        console.error("❌ Error getting unread count:", error);
        return 0;
    }
};

// Search conversations
export const searchConversations = async (userEmail, userType = 'customer', searchTerm) => {
    try {
        const conversations = await getUserConversations(userEmail, userType);

        if (!searchTerm || searchTerm.trim() === '') {
            return conversations;
        }

        const filteredConversations = conversations.filter(conversation => {
            const searchIn = userType === 'customer'
                ? conversation.businessName
                : conversation.customerName;

            return searchIn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conversation.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
        });

        console.log(`🔍 Search "${searchTerm}" found ${filteredConversations.length} results`);
        return filteredConversations;
    } catch (error) {
        console.error("❌ Error searching conversations:", error);
        return [];
    }
};

// Search businesses by name or email for starting new conversations
export const searchBusinessesForMessaging = async (searchTerm) => {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }

        const { collection, getDocs, query, where, or } = await import('firebase/firestore');
        const { db } = await import('./config');

        const term = searchTerm.toLowerCase().trim();
        const businessesRef = collection(db, "Businesses");

        // Search by business name or email
        // Since Firestore doesn't support case-insensitive search or partial matching well,
        // we'll get all businesses and filter client-side for now
        const allBusinessesSnapshot = await getDocs(businessesRef);

        const matchingBusinesses = allBusinessesSnapshot.docs
            .map(doc => ({
                id: doc.id,
                email: doc.id, // Document ID is the email
                ...doc.data()
            }))
            .filter(business => {
                const businessName = (business.businessName || '').toLowerCase();
                const businessEmail = (business.email || '').toLowerCase();

                return businessName.includes(term) || businessEmail.includes(term);
            })
            .slice(0, 10); // Limit results to 10

        console.log(`🔍 Business search "${searchTerm}" found ${matchingBusinesses.length} results`);
        return matchingBusinesses;
    } catch (error) {
        console.error("❌ Error searching businesses:", error);
        return [];
    }
};

// Get conversation details
export const getConversationDetails = async (customerEmail, businessEmail) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);
        const conversationDoc = await getDoc(conversationRef);

        if (conversationDoc.exists()) {
            return {
                id: conversationDoc.id,
                ...conversationDoc.data(),
                lastTimestamp: conversationDoc.data().lastTimestamp?.toDate() || new Date()
            };
        }

        return null;
    } catch (error) {
        console.error("❌ Error getting conversation details:", error);
        return null;
    }
};

// Update conversation metadata (names, etc.)
export const updateConversationMetadata = async (customerEmail, businessEmail, updateData) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationRef = doc(db, "Messages", chatId);

        await updateDoc(conversationRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Updated conversation metadata for: ${chatId}`);
        return true;
    } catch (error) {
        console.error("❌ Error updating conversation metadata:", error);
        return false;
    }
};

// Get customer information for a conversation (for business use)
export const getCustomerInfoForConversation = async (customerEmail, businessEmail) => {
    try {
        const chatId = createChatId(customerEmail, businessEmail);
        const conversationDoc = await getDoc(doc(db, "Messages", chatId));

        if (conversationDoc.exists()) {
            const data = conversationDoc.data();
            return {
                customerEmail: data.customerId,
                customerName: data.customerName || customerEmail,
                lastMessage: data.lastMessage,
                lastTimestamp: data.lastTimestamp,
                customerUnreadCount: data.customerUnreadCount || 0,
                businessUnreadCount: data.businessUnreadCount || 0
            };
        }

        return null;
    } catch (error) {
        console.error("❌ Error getting customer info:", error);
        return null;
    }
};

// Alias functions for backward compatibility
export const subscribeToMessages = listenToMessages;
export const subscribeToConversations = listenToConversations;

// Function to start conversation with business (for user components)
export const startConversationWithBusiness = async (currentUserEmail, businessEmail, initialMessage = '', businessName = 'Business') => {
    try {
        console.log('🆕 Starting conversation with business:', {
            customer: currentUserEmail,
            business: businessEmail,
            businessName,
            hasInitialMessage: !!initialMessage
        });

        // Initialize the conversation
        const conversationData = await initializeConversation(
            currentUserEmail,
            businessEmail,
            currentUserEmail, // Use email as name for now
            businessName
        );

        console.log('✅ Conversation initialized:', conversationData);

        // Send initial message if provided
        if (initialMessage.trim()) {
            const messageData = {
                senderId: currentUserEmail,
                receiverId: businessEmail,
                text: initialMessage.trim(),
                type: 'text'
            };

            console.log('📤 Sending initial message:', messageData);
            await sendMessage(currentUserEmail, businessEmail, messageData);
            console.log('✅ Initial message sent');
        }

        console.log('🎉 Conversation creation completed successfully');
        return true;
    } catch (error) {
        console.error("❌ Error starting conversation with business:", error);
        throw error;
    }
};
