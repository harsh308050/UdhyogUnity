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
            conversationsQuery = query(
                conversationsRef,
                where("customerId", "==", userEmail),
                orderBy("lastTimestamp", "desc")
            );
        } else {
            conversationsQuery = query(
                conversationsRef,
                where("businessId", "==", userEmail),
                orderBy("lastTimestamp", "desc")
            );
        }

        const querySnapshot = await getDocs(conversationsQuery);
        const conversations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastTimestamp: doc.data().lastTimestamp?.toDate() || new Date()
        }));

        console.log(`📋 Found ${conversations.length} conversations for ${userEmail}`);
        return conversations;
    } catch (error) {
        console.error("❌ Error fetching conversations:", error);
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
            conversationsQuery = query(
                conversationsRef,
                where("customerId", "==", userEmail),
                orderBy("lastTimestamp", "desc")
            );
        } else {
            conversationsQuery = query(
                conversationsRef,
                where("businessId", "==", userEmail),
                orderBy("lastTimestamp", "desc")
            );
        }

        return onSnapshot(conversationsQuery, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lastTimestamp: doc.data().lastTimestamp?.toDate() || new Date()
            }));

            console.log(`📬 Real-time: ${conversations.length} conversations for ${userEmail}`);
            callback(conversations);
        }, (error) => {
            console.error("❌ Error listening to conversations:", error);
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
