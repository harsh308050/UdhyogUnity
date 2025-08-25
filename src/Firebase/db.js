import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

// db is now imported directly from config.js, so we don't need to reinitialize it

export const addUserToFirestore = async (user, additionalData = {}) => {
    if (!user) return;

    // Debug data being received
    console.log("addUserToFirestore received:", { user, additionalData });

    // Use 'users' collection
    const userRef = doc(db, "Customers", user.email);

    try {
        // Create the user data object with all required fields
        const userData = {
            email: user.email,
            firstName: additionalData.firstName || '',
            lastName: additionalData.lastName || '',
            phone: additionalData.phone || '',
            city: additionalData.city || '',
            cityName: additionalData.cityName || '',
            state: additionalData.state || '',
            stateName: additionalData.stateName || '',
            address: additionalData.address || '',
            userType: additionalData.userType || 'customer',
            photoURL: additionalData.photoURL || user.photoURL || '',
        };

        console.log("Writing to Firestore:", userData);

        // Use merge: true to update existing documents without overwriting fields
        await setDoc(userRef, userData, { merge: true });
        return userRef;
    } catch (error) {
        console.error("Error creating customer document", error);
        throw error;
    }
};

export const getUserFromFirestore = async (email) => {
    if (!email) return null;

    // Change to 'users' collection
    const userRef = doc(db, "Customers", email);

    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Normalize photoURL if it's an object
            if (userData.photoURL && typeof userData.photoURL === 'object') {
                console.log("Normalizing photoURL in getUserFromFirestore:", userData.photoURL);
                userData.photoURL = userData.photoURL.url || userData.photoURL.toString() || '';
            }

            return userData;
        } else {
            console.log("No user found in Firestore for email:", email);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user from Firestore:", error);
        throw error;
    }
};

export const updateUserInFirestore = async (email, data) => {
    if (!email) return;

    const userRef = doc(db, "Customers", email);
    try {
        await updateDoc(userRef, data);
        return true;
    } catch (error) {
        console.error("Error updating customer document", error);
        return false;
    }
};

export { db };