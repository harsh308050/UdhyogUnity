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
import { uploadProfilePhoto } from "./storage";

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
            photoURL: user.photoURL || '',
            // Removed userType field
        });

        return user;
    } catch (error) {
        console.error("Sign-up error:", error);
        throw error;
    }
};

export const signIn = async (email, password) => {
    try {
        // Use session persistence - user will need to sign in again after closing browser
        await setPersistence(auth, browserSessionPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const signInWithGoogle = async () => {
    try {
        // Use session persistence for Google sign-in as well
        await setPersistence(auth, browserSessionPersistence);
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Save user data to Firestore
        const userData = {
            email: user.email,
            firstName: user.displayName ? user.displayName.split(" ")[0] : "",
            lastName: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
            photoURL: user.photoURL || "",
        };

        await addUserToFirestore(user, userData);

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
