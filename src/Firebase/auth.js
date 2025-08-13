import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { app } from "./config";
import { addUserToFirestore } from "./db";
import { uploadProfilePhoto } from "./storage";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signUp = async (email, password, userData = {}) => {
    try {
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
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const signInWithGoogle = async () => {
    try {
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
        return true;
    } catch (error) {
        throw error;
    }
};

export { auth };
