import { getFirestore, doc, setDoc, getDoc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "./config";

// db is now imported directly from config.js, so we don't need to reinitialize it

// Add business user to Firestore
export const addBusinessUserToFirestore = async (user, additionalData = {}) => {
    if (!user) return;

    console.log("addBusinessUserToFirestore received:", { user, additionalData });

    // Use 'BusinessUsers' collection for business authentication
    const userRef = doc(db, "BusinessUsers", user.email);

    try {
        // Ensure phone number has +91 prefix
        let formattedPhone = additionalData.phone || '';
        if (formattedPhone && !formattedPhone.startsWith('+91')) {
            // Remove any existing country code and ensure it starts with +91
            formattedPhone = formattedPhone.replace(/^\+?91?/, '');
            formattedPhone = '+91' + formattedPhone;
        }

        const userData = {
            email: user.email,
            businessName: additionalData.businessName || '',
            contactPerson: additionalData.contactPerson || '',
            phone: formattedPhone,
            businessType: additionalData.businessType || '',
            accountType: 'business',
            isVerified: additionalData.isVerified || false,
            createdAt: additionalData.createdAt || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            status: 'active'
        };

        console.log("Writing business user to Firestore:", userData);

        await setDoc(userRef, userData, { merge: true });
        return userRef;
    } catch (error) {
        console.error("Error creating business user document", error);
        throw error;
    }
};

// Get business user from Firestore by email or phone
export const getBusinessUserFromFirestore = async (email = null, phone = null) => {
    if (!email && !phone) return null;

    try {
        if (email) {
            // Search by email (primary key)
            const userRef = doc(db, "BusinessUsers", email);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                return userDoc.data();
            }
        }

        if (phone) {
            // Search by phone number
            const q = query(
                collection(db, "BusinessUsers"),
                where("phone", "==", phone)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }
        }

        console.log("No business user found for:", { email, phone });
        return null;
    } catch (error) {
        console.error("Error fetching business user from Firestore:", error);
        throw error;
    }
};

// Update business user in Firestore
export const updateBusinessUserInFirestore = async (email, data) => {
    if (!email) return;

    const userRef = doc(db, "BusinessUsers", email);
    try {
        await updateDoc(userRef, {
            ...data,
            lastUpdated: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error updating business user document", error);
        return false;
    }
};

// Check if business is already registered (for registration flow)
export const checkBusinessExists = async (email, phone) => {
    try {
        const businessData = await getBusinessUserFromFirestore(email, phone);
        return businessData !== null;
    } catch (error) {
        console.error("Error checking business existence:", error);
        return false;
    }
};

// Link business registration to business user account
export const linkBusinessRegistrationToUser = async (userEmail, businessId) => {
    if (!userEmail || !businessId) return false;

    try {
        await updateBusinessUserInFirestore(userEmail, {
            linkedBusinessId: businessId,
            isBusinessRegistered: true,
            businessRegistrationDate: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error linking business registration to user:", error);
        return false;
    }
};

export { db };
