import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, browserSessionPersistence, setPersistence } from "firebase/auth";
import { auth, logOut } from "../Firebase/auth";
import { getUserFromFirestore } from "../Firebase/db";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ensure we're using session persistence
        setPersistence(auth, browserSessionPersistence)
            .catch(error => console.error("Failed to set persistence:", error));

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // If we have a user, verify they are valid
            if (user) {
                try {
                    console.log("User authenticated:", user.email);
                    const details = await getUserFromFirestore(user.email);

                    if (details) {
                        setCurrentUser(user);
                        setUserDetails(details);
                    } else {
                        // If we can't get the user details, they might be invalid
                        console.warn("User found in auth but not in Firestore, logging out");
                        await logOut();
                        setCurrentUser(null);
                        setUserDetails(null);
                    }
                } catch (error) {
                    console.error("Error fetching user details:", error);
                    setCurrentUser(null);
                    setUserDetails(null);
                }
            } else {
                // No user is signed in
                setCurrentUser(null);
                setUserDetails(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Add logout function to the context for easy access
    const logout = async () => {
        try {
            await logOut();
            setCurrentUser(null);
            setUserDetails(null);
            return true;
        } catch (error) {
            console.error("Error during logout:", error);
            return false;
        }
    };

    const value = {
        currentUser,
        userDetails,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div>Loading...</div> : children}
        </AuthContext.Provider>
    );
};