// src/Firebase/addBusiness.js
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "./db";

const sanitizeData = (obj) => {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj
            .map(item => sanitizeData(item))
            .filter(item => item !== null && item !== undefined);
    }

    if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedValue = sanitizeData(value);
            // Only add the property if it's not null or undefined
            if (sanitizedValue !== null && sanitizedValue !== undefined) {
                sanitized[key] = sanitizedValue;
            }
        }
        return sanitized;
    }

    return obj;
};

export const addBusinessToFirestore = async (businessData) => {
    try {
        // Generate a sanitized business name for the document ID
        const businessId = businessData.businessName?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'business_' + Date.now();
        const businessEmail = businessData.email;

        // Ensure phone number has +91 prefix
        let formattedPhoneNumber = businessData.phoneNumber;
        if (formattedPhoneNumber && !formattedPhoneNumber.startsWith('+91')) {
            // Remove any existing country code and ensure it starts with +91
            formattedPhoneNumber = formattedPhoneNumber.replace(/^\+?91?/, '');
            formattedPhoneNumber = '+91' + formattedPhoneNumber;
        }

        // Sanitize the business data to remove undefined/null values
        const sanitizedData = sanitizeData({
            ...businessData,
            phoneNumber: formattedPhoneNumber, // Use the formatted phone number
            businessId: businessId, // Also store the ID as a field
            status: 'active', // Set business as active immediately
            isVerified: true, // Mark as verified immediately
            isBusinessRegistered: true, // Mark registration as complete
            // Store both the state code and state name
            state: businessData.state,
            stateName: businessData.stateName,
            // Store both the city id and city name
            city: businessData.city,
            cityName: businessData.cityName,
            createdAt: new Date().toISOString(),
            verifiedAt: new Date().toISOString() // Mark as verified immediately
        });

        console.log('Sanitized business data for Firestore:', JSON.stringify(sanitizedData, null, 2));

        // Create a document with custom ID (businessId) in Businesses collection
        const businessRef = doc(db, "Businesses", businessEmail);
        await setDoc(businessRef, sanitizedData);

        return businessId;
    } catch (error) {
        console.error("Error adding business to Firestore:", error);
        throw error;
    }
};
