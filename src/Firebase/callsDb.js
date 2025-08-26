import {
    collection,
    doc,
    addDoc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    arrayUnion
} from 'firebase/firestore';
import { db } from './config';

// Find or create a call - ensures only one call document exists between two users
export const findOrCreateCall = async ({ callerId, receiverId, type = 'voice', callerName = null, receiverName = null }) => {
    const callsRef = collection(db, 'calls');
    
    // First, check for any existing ringing or active calls between these users
    const existingCallQuery = query(
        callsRef,
        where('callerId', '==', callerId),
        where('receiverId', '==', receiverId),
        where('status', 'in', ['ringing', 'connecting', 'active'])
    );
    
    try {
        const snapshot = await getDocs(existingCallQuery);
        
        if (!snapshot.empty) {
            // Return the first existing active call
            const existingCall = snapshot.docs[0];
            console.log('📞 Found existing call document:', existingCall.id);
            return { id: existingCall.id, ref: existingCall.ref, existed: true };
        }
    } catch (error) {
        console.warn('Error checking for existing calls:', error);
    }
    
    // No existing call found, create a new one
    return await createCall({ callerId, receiverId, type, callerName, receiverName });
};

// Create a new call document - prevents duplicates by checking for existing active calls
export const createCall = async ({ callerId, receiverId, type = 'voice', startTime = null, callerName = null, receiverName = null }) => {
    const callsRef = collection(db, 'calls');
    
    // Check if there's already an active call between these users (in last 30 seconds)
    const recentTime = Date.now() - 30000; // 30 seconds ago
    const existingCallQuery = query(
        callsRef,
        where('callerId', '==', callerId),
        where('receiverId', '==', receiverId),
        where('status', 'in', ['ringing', 'connecting', 'active'])
    );
    
    try {
        const existingCallsSnapshot = await getDocs(existingCallQuery);
        
        // If there's an existing active call, return it instead of creating a new one
        if (!existingCallsSnapshot.empty) {
            const existingCall = existingCallsSnapshot.docs[0];
            const existingCallData = existingCall.data();
            
            // Check if the existing call is very recent (within 30 seconds)
            if (existingCallData.startTime && (existingCallData.startTime > recentTime)) {
                console.log('📞 Using existing call document:', existingCall.id);
                return { id: existingCall.id, ref: existingCall.ref };
            }
        }
    } catch (error) {
        console.warn('Error checking for existing calls:', error);
        // Continue to create new call if check fails
    }
    
    // Create new call document if no recent active call exists
    const callData = {
        callerId,
        receiverId,
        type,
        status: 'ringing',
        createdAt: serverTimestamp(),
        startTime: startTime || Date.now(),
        callerName: callerName || callerId,
        receiverName: receiverName || receiverId,
        offer: null,
        answer: null,
        iceCandidates: { caller: [], receiver: [] }
    };

    const callDocRef = await addDoc(callsRef, callData);
    console.log('📞 Created new call document:', callDocRef.id);
    return { id: callDocRef.id, ref: callDocRef };
};

export const updateCallOffer = async (callId, offer) => {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { offer });
};

export const updateCallAnswer = async (callId, answer) => {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { answer });
};

export const addIceCandidate = async (callId, role, candidate) => {
    const callRef = doc(db, 'calls', callId);
    const field = `iceCandidates.${role}`;
    await updateDoc(callRef, { [field]: arrayUnion(candidate) });
};

export const updateCallStatus = async (callId, status) => {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status });
};

export const getCall = async (callId) => {
    const callRef = doc(db, 'calls', callId);
    const snap = await getDoc(callRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const listenToCall = (callId, callback) => {
    const callRef = doc(db, 'calls', callId);
    return onSnapshot(callRef, (snap) => {
        if (!snap.exists()) return;
        callback({ id: snap.id, ...snap.data() });
    });
};

// Listen for incoming calls where receiverId == userId and status == 'ringing'
export const listenToIncomingCalls = (userId, callback) => {
    const callsRef = collection(db, 'calls');
    // Filter by receiverId and status to avoid needing an orderBy/index for now
    const q = query(callsRef, where('receiverId', '==', userId), where('status', '==', 'ringing'));
    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added' || change.type === 'modified') {
                const data = { id: change.doc.id, ...change.doc.data() };
                callback(data);
            }
        });
    });
};

// Get call history for a user (both incoming and outgoing)
export const getCallHistory = async (userId, limit = 20) => {
    const callsRef = collection(db, 'calls');

    // Get calls where user is either caller or receiver
    const outgoingQuery = query(
        callsRef,
        where('callerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(Math.ceil(limit / 2))
    );

    const incomingQuery = query(
        callsRef,
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(Math.ceil(limit / 2))
    );

    try {
        const [outgoingSnapshot, incomingSnapshot] = await Promise.all([
            getDocs(outgoingQuery),
            getDocs(incomingQuery)
        ]);

        const calls = [];

        outgoingSnapshot.forEach(doc => {
            calls.push({ id: doc.id, ...doc.data(), direction: 'outgoing' });
        });

        incomingSnapshot.forEach(doc => {
            calls.push({ id: doc.id, ...doc.data(), direction: 'incoming' });
        });

        // Sort by timestamp and return limited results
        return calls
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, limit);

    } catch (error) {
        console.error('Error fetching call history:', error);
        return [];
    }
};
