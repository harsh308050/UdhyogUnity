import {
    collection,
    doc,
    addDoc,
    getDoc,
    deleteDoc,
    setDoc,
    updateDoc,
    runTransaction,
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

// Helper to build a symmetric pair key for a call lock
const getPairKey = (a, b) => {
    try {
        return [a, b].filter(Boolean).map(String).sort().join('|');
    } catch {
        return `${a}||${b}`;
    }
};

// TTL in ms for considering a lock "active" if a cleanup didn't run
const CALL_LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Find or create a call - ensures only one call document exists between two users
export const findOrCreateCall = async ({ callerId, receiverId, type = 'voice', callerName = null, receiverName = null }) => {
    const callsCol = collection(db, 'calls');
    const locksCol = collection(db, 'callLocks');
    const pairKey = getPairKey(callerId, receiverId);
    const lockRef = doc(locksCol, pairKey);

    // Quick pre-check for an existing active call (non-transactional). This reduces churn if a call already exists.
    try {
        const snapshot = await getDocs(query(
            callsCol,
            where('callerId', '==', callerId),
            where('receiverId', '==', receiverId),
            where('status', 'in', ['ringing', 'connecting', 'active'])
        ));
        if (!snapshot.empty) {
            const existing = snapshot.docs[0];
            // Try to claim/create the lock for this existing call
            const res = await runTransaction(db, async (tx) => {
                const now = Date.now();
                const lockSnap = await tx.get(lockRef);
                tx.set(lockRef, {
                    callId: existing.id,
                    status: existing.data().status || 'ringing',
                    createdAt: lockSnap.exists() ? lockSnap.data().createdAt || serverTimestamp() : serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    updatedAtMs: now,
                    callerId,
                    receiverId,
                    type: existing.data().type || type,
                }, { merge: true });
                return { id: existing.id, ref: existing.ref, existed: true };
            });
            console.log('📞 Using existing call via lock', res.id);
            return res;
        }
    } catch (e) {
        console.warn('Existing-call precheck failed, will create via lock:', e);
    }

    // Use a transaction over a per-pair lock doc to avoid duplicate call docs
    const result = await runTransaction(db, async (tx) => {
        const now = Date.now();
        const lockSnap = await tx.get(lockRef);

        if (lockSnap.exists()) {
            const lock = lockSnap.data();
            const lastUpdate = typeof lock.updatedAtMs === 'number' ? lock.updatedAtMs : 0;
            const isFresh = now - lastUpdate < CALL_LOCK_TTL_MS;

            // If there's a fresh lock, return the existing callId
            if (isFresh && lock.callId && lock.status && ['ringing', 'connecting', 'active'].includes(lock.status)) {
                const callRef = doc(db, 'calls', lock.callId);
                const callSnap = await tx.get(callRef);
                if (callSnap.exists()) {
                    return { id: callSnap.id, ref: callRef, existed: true };
                }
                // If lock exists but call doc not found, fall through to create new and replace lock
            }
        }

        // Create a brand new call doc and lock atomically
        const newCallRef = doc(callsCol);
        const callData = {
            callerId,
            receiverId,
            type,
            status: 'ringing',
            createdAt: serverTimestamp(),
            startTime: now,
            callerName: callerName || callerId,
            receiverName: receiverName || receiverId,
            offer: null,
            answer: null,
            iceCandidates: { caller: [], receiver: [] },
            pairKey,
        };
        tx.set(newCallRef, callData);
        tx.set(lockRef, {
            callId: newCallRef.id,
            status: 'ringing',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedAtMs: now,
            callerId,
            receiverId,
            type,
        });
        return { id: newCallRef.id, ref: newCallRef, existed: false };
    });

    console.log(result.existed ? '📞 Using existing call via lock' : '📞 Created new call via lock', result.id);
    return result;
};

// Create a new call document - prevents duplicates by checking for existing active calls
export const createCall = async ({ callerId, receiverId, type = 'voice', startTime = null, callerName = null, receiverName = null }) => {
    // Use the transactional path to avoid duplicates
    return await findOrCreateCall({ callerId, receiverId, type, callerName, receiverName });
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

    // Release the per-pair lock when the call ends or is rejected
    try {
        const snap = await getDoc(callRef);
        if (snap.exists()) {
            const data = snap.data();
            const pairKey = data.pairKey || getPairKey(data.callerId, data.receiverId);
            const lockRef = doc(db, 'callLocks', pairKey);
            if (status === 'ended' || status === 'rejected') {
                // Delete the lock to allow new calls immediately
                await deleteDoc(lockRef);
            } else {
                // Heartbeat the lock with the new status
                await setDoc(lockRef, {
                    callId,
                    status,
                    updatedAt: serverTimestamp(),
                    updatedAtMs: Date.now(),
                    callerId: data.callerId,
                    receiverId: data.receiverId,
                    type: data.type,
                }, { merge: true });
            }
        }
    } catch (e) {
        console.warn('Failed to update call lock status:', e);
    }
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
