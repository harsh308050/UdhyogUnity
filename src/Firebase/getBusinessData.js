// src/Firebase/getBusinessData.js
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

/**
 * Fetch business data from Businesses collection using email
 * @param {string} email - Business email to fetch data for
 * @returns {Object|null} Business data or null if not found
 */
export const getBusinessDataFromFirestore = async (email) => {
    try {
        if (!email) {
            console.error("Email is required to fetch business data");
            return null;
        }

        console.log("Fetching business data for email:", email);

        // Reference to the business document using email as document ID
        const businessRef = doc(db, "Businesses", email);
        const businessDoc = await getDoc(businessRef);

        if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            console.log("Business data found:", businessData);
            return businessData;
        } else {
            console.log("No business found with email:", email);
            return null;
        }
    } catch (error) {
        console.error("Error fetching business data:", error);
        throw error;
    }
};

/**
 * Update business data in Businesses collection
 * @param {string} email - Business email
 * @param {Object} updateData - Data to update
 * @returns {boolean} Success status
 */
export const updateBusinessDataInFirestore = async (email, updateData) => {
    try {
        if (!email) {
            console.error("Email is required to update business data");
            return false;
        }

        console.log("Updating business data for email:", email, "with data:", updateData);

        // Reference to the business document using email as document ID
        const businessRef = doc(db, "Businesses", email);

        // Add timestamp for last update
        const dataWithTimestamp = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(businessRef, dataWithTimestamp);
        console.log("Business data updated successfully");
        return true;
    } catch (error) {
        console.error("Error updating business data:", error);
        throw error;
    }
};

/**
 * Get business email from session storage or authentication context
 * @returns {string|null} Business email
 */
export const getCurrentBusinessEmail = () => {
    try {
        // Try to get from session storage first
        const storedBusinessData = sessionStorage.getItem('businessData');
        if (storedBusinessData) {
            const parsedData = JSON.parse(storedBusinessData);
            return parsedData.email;
        }

        // Could also check authentication context here if needed
        return null;
    } catch (error) {
        console.error("Error getting current business email:", error);
        return null;
    }
};
