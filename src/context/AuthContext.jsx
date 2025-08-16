import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, browserSessionPersistence, setPersistence } from "firebase/auth";
import { auth, logOut } from "../Firebase/auth";
import { getUserFromFirestore } from "../Firebase/db";
import { getBusinessUserFromFirestore } from "../Firebase/businessDb";
import { getBusinessDataFromFirestore } from "../Firebase/getBusinessData";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState(null); // 'customer' or 'business'

    useEffect(() => {
        // Check for existing business data in session storage
        const checkExistingBusinessData = () => {
            const businessData = sessionStorage.getItem('businessData');
            const businessAuthEmail = sessionStorage.getItem('businessAuthEmail');

            if (businessData && businessAuthEmail) {
                try {
                    const parsedData = JSON.parse(businessData);
                    console.log("Found existing business data in session storage:", parsedData.email);
                    return {
                        exists: true,
                        data: parsedData,
                        email: businessAuthEmail
                    };
                } catch (error) {
                    console.error("Error parsing business data from session storage:", error);
                }
            }
            return { exists: false };
        };

        // Ensure we're using session persistence
        setPersistence(auth, browserSessionPersistence)
            .catch(error => console.error("Failed to set persistence:", error));

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Check for existing business session first
            const businessSession = checkExistingBusinessData();

            // If we have a user, verify they are valid
            if (user) {
                console.log("User authenticated:", user.email);
                try {
                    // If we have business session data, use that first
                    if (businessSession.exists) {
                        console.log("Using existing business session data");
                        setCurrentUser(user);
                        setUserDetails(businessSession.data);
                        setUserType('business');
                        setLoading(false);
                        return;
                    }

                    // Check if this is a customer
                    const customerDetails = await getUserFromFirestore(user.email);

                    if (customerDetails) {
                        console.log("Found customer details in Firestore");
                        setCurrentUser(user);
                        setUserDetails(customerDetails);
                        setUserType('customer');
                    } else {
                        // If not found in Customers, check BusinessUsers collection
                        const businessUserDetails = await getBusinessUserFromFirestore(user.email);

                        if (businessUserDetails) {
                            console.log("Found business user details in Firestore");

                            // Try to get full business data
                            const businessData = await getBusinessDataFromFirestore(user.email);

                            if (businessData) {
                                console.log("Found full business data in Firestore");
                                setCurrentUser(user);
                                setUserDetails(businessData);
                                setUserType('business');

                                // Store business data in session storage for business dashboard
                                sessionStorage.setItem('businessData', JSON.stringify(businessData));
                                sessionStorage.setItem('businessAuthEmail', user.email);
                                sessionStorage.setItem('userType', 'business');
                            } else {
                                // Use the basic business user data if full data not available
                                setCurrentUser(user);
                                setUserDetails(businessUserDetails);
                                setUserType('business');

                                // Store business user data in session storage
                                sessionStorage.setItem('businessData', JSON.stringify(businessUserDetails));
                                sessionStorage.setItem('businessAuthEmail', user.email);
                                sessionStorage.setItem('userType', 'business');
                            }
                        } else {
                            // Try one more method - check if we have a business email in localStorage
                            const businessEmail = localStorage.getItem('businessEmail');
                            if (businessEmail) {
                                console.log("Found business email in localStorage, checking Firestore");
                                const businessData = await getBusinessDataFromFirestore(businessEmail);

                                if (businessData) {
                                    console.log("Found business data for saved email:", businessEmail);
                                    setCurrentUser(user);
                                    setUserDetails(businessData);
                                    setUserType('business');

                                    // Update session storage
                                    sessionStorage.setItem('businessData', JSON.stringify(businessData));
                                    sessionStorage.setItem('businessAuthEmail', businessEmail);
                                    sessionStorage.setItem('userType', 'business');
                                    return;
                                }
                            }

                            // User not found in either collection
                            console.warn("User found in auth but not in Firestore, logging out");
                            await logOut();
                            setCurrentUser(null);
                            setUserDetails(null);
                            setUserType(null);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user details:", error);
                    setCurrentUser(null);
                    setUserDetails(null);
                    setUserType(null);
                }
            } else {
                // Check if we're already in a business session even without auth
                if (businessSession.exists) {
                    console.log("No user in auth but found business session, attempting to maintain session");
                    setUserDetails(businessSession.data);
                    setUserType('business');
                } else {
                    // No user is signed in and no session
                    console.log("No user is signed in and no session found");
                    setCurrentUser(null);
                    setUserDetails(null);
                    setUserType(null);
                }
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
            setUserType(null);

            // Clear all business data from storage
            sessionStorage.removeItem('businessData');
            sessionStorage.removeItem('businessAuthEmail');
            sessionStorage.removeItem('userType');
            localStorage.removeItem('businessEmail');

            return true;
        } catch (error) {
            console.error("Error during logout:", error);
            return false;
        }
    };

    const value = {
        currentUser,
        userDetails,
        userType,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div>Loading...</div> : children}
        </AuthContext.Provider>
    );
};