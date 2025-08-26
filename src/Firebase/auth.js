import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    browserSessionPersistence,
    setPersistence
} from "firebase/auth";
import { app } from "./config";
import { addUserToFirestore } from "./db";

const auth = getAuth(app);
// Set auth to use session persistence - will be cleared when browser is closed
setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error("Error setting auth persistence:", error);
});

const googleProvider = new GoogleAuthProvider();

export const signUp = async (email, password, userData = {}) => {
    try {
        // Use session persistence for sign-up
        await setPersistence(auth, browserSessionPersistence);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user data to Firestore without profile picture
        await addUserToFirestore(user, {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phone: userData.phone || '',
            city: userData.city || '',
            cityName: userData.cityName || '',
            state: userData.state || '',
            stateName: userData.stateName || '',
            address: userData.address || '',
            userType: userData.userType || 'customer',
            photoURL: user.photoURL || '',
        });

        return user;
    } catch (error) {
        console.error("Sign-up error:", error);
        throw error;
    }
};

export const signIn = async (email, password) => {
    // Use session persistence - user will need to sign in again after closing browser
    await setPersistence(auth, browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

export const signInWithGoogle = async () => {
    try {
        // Use session persistence for Google sign-in as well
        await setPersistence(auth, browserSessionPersistence);
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Normalize user data - ensure photoURL is a string
        if (user.photoURL && typeof user.photoURL === 'object') {
            console.log("Normalizing photoURL from Google sign-in:", user.photoURL);
            user.photoURL = user.photoURL.url || user.photoURL.toString() || '';
        }

        // Do NOT automatically add to Firestore here
        // We want to check first if they exist, and if not, collect additional info
        console.log("Successful Google sign-in, returning user data:", user);

        return user;
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};

export const logOut = async () => {
    try {
        await signOut(auth);
        // Clear any session storage or local storage items related to auth
        sessionStorage.removeItem('authUser');
        console.log("User successfully logged out. You'll need to log in again next time.");
        return true;
    } catch (error) {
        console.error("Logout error:", error);
        throw error;
    }
};

export { auth };
