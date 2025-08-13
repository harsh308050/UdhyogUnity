// src/Firebase/favoriteDb.js
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    Timestamp,
    setDoc
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firebase Collection Structure (New Schema):
 * 
 * UserFavorites Collection
 * └── [userEmail] (document ID)
 *     ├── Businesses (subcollection)
 *     │   └── [businessId] (document)
 *     │       └── { businessData, createdAt, ... }
 *     ├── Products (subcollection)
 *     │   └── [productId] (document)
 *     │       └── { productData, createdAt, ... }
 *     └── Services (subcollection)
 *         └── [serviceId] (document)
 *             └── { serviceData, createdAt, ... }
 */

// Add a new favorite (business, product, or service)
export const addToFavorites = async (userEmail, itemId, type, itemData = {}) => {
    try {
        console.log(`🔔 addToFavorites called with:`, {
            userEmail,
            itemId,
            type,
            itemDataKeys: Object.keys(itemData)
        });

        if (!userEmail || !itemId || !type) {
            throw new Error("User email, item ID, and type are required");
        }

        // Validate type
        const validTypes = ['Businesses', 'Products', 'Services'];
        let capitalizedType;

        if (type.toLowerCase() === 'business') {
            capitalizedType = 'Businesses';
        } else if (type.toLowerCase() === 'product') {
            capitalizedType = 'Products';
        } else if (type.toLowerCase() === 'service') {
            capitalizedType = 'Services';
        } else {
            throw new Error("Type must be 'business', 'product', or 'service'");
        }

        console.log(`🔍 Validating type: ${type} -> ${capitalizedType}`);
        console.log(`🔍 Checking if ${itemId} (${type}) already exists in favorites...`);

        // Check if already in favorites
        const existingFavorite = await checkIfFavorite(userEmail, itemId, type);
        if (existingFavorite) {
            console.log(`⚠️ Item already in favorites:`, existingFavorite);
            return existingFavorite; // Already in favorites
        }

        // Prepare favorite data with complete field mapping
        const favoriteData = {
            itemId,
            type: type.toLowerCase(),
            createdAt: Timestamp.now(),

            // Common fields
            name: itemData.name || itemData.serviceName || itemData.productName || itemData.businessName || '',

            // Business-specific fields
            ...(type.toLowerCase() === 'business' && {
                businessName: itemData.businessName || itemData.name || '',
                businessType: itemData.businessType || '',
                description: itemData.description || itemData.businessDescription || '',
                location: itemData.location || '',
                address: itemData.address || {},
                rating: itemData.rating || 4.0,
                reviewCount: itemData.reviewCount || 0,
                category: itemData.category || itemData.businessType || '',
                logo: itemData.logo || itemData.imageUrl || '',
                isVerified: itemData.isVerified || false,
                email: itemData.email || '',
                phoneNumber: itemData.phoneNumber || '',
                city: itemData.city || itemData.cityName || '',
                state: itemData.state || itemData.stateName || ''
            }),

            // Product-specific fields
            ...(type.toLowerCase() === 'product' && {
                productName: itemData.name || itemData.productName || '',
                description: itemData.description || '',
                price: itemData.price || 0,
                originalPrice: itemData.originalPrice || null,
                businessId: itemData.businessId || itemData.businessEmail || '',
                businessName: itemData.businessName || '',
                category: itemData.category || '',
                images: itemData.images || [],
                inStock: itemData.inStock || true,
                rating: itemData.rating || 4.0,
                reviewCount: itemData.reviewCount || 0,
                createdAt: itemData.createdAt || new Date().toISOString()
            }),

            // Service-specific fields
            ...(type.toLowerCase() === 'service' && {
                serviceName: itemData.name || itemData.serviceName || '',
                description: itemData.description || '',
                price: itemData.price || 0,
                businessId: itemData.businessId || itemData.businessEmail || '',
                businessName: itemData.businessName || '',
                duration: itemData.duration || '',
                category: itemData.category || '',
                images: itemData.images || [],
                isActive: itemData.isActive !== false, // Default to true unless explicitly false
                rating: itemData.rating || 4.0,
                reviewCount: itemData.reviewCount || 0,
                createdAt: itemData.createdAt || new Date().toISOString()
            })
        };

        console.log(`📋 Prepared favorite data for ${type}:`, {
            favoriteDataKeys: Object.keys(favoriteData),
            favoriteData: favoriteData
        });

        // Create user document if it doesn't exist
        const userDocRef = doc(db, "UserFavorites", userEmail);
        console.log(`📁 Creating/updating user document for: ${userEmail}`);
        await setDoc(userDocRef, { createdAt: Timestamp.now() }, { merge: true });

        // Add to appropriate subcollection
        const subcollectionRef = collection(userDocRef, capitalizedType);
        console.log(`💾 Saving to subcollection: ${capitalizedType}, itemId: ${itemId}`);
        await setDoc(doc(subcollectionRef, itemId), favoriteData);

        console.log(`✅ Successfully saved ${type} favorite for user ${userEmail}`);

        return {
            id: itemId,
            ...favoriteData
        };
    } catch (error) {
        console.error(`❌ Error adding ${type} to favorites:`, error);
        throw error;
    }
};

// Remove from favorites
export const removeFromFavorites = async (userEmail, itemId, type) => {
    try {
        if (!userEmail || !itemId || !type) {
            throw new Error("User email, item ID, and type are required");
        }

        // Validate and format type
        const validTypes = ['Businesses', 'Products', 'Services'];
        let capitalizedType;
        if (type === 'business') {
            capitalizedType = 'Businesses';
        } else if (type === 'product') {
            capitalizedType = 'Products';
        } else if (type === 'service') {
            capitalizedType = 'Services';
        } else {
            throw new Error("Type must be 'business', 'product', or 'service'");
        }

        // Reference to the specific favorite document
        const userDocRef = doc(db, "UserFavorites", userEmail);
        const favoriteDocRef = doc(collection(userDocRef, capitalizedType), itemId);

        // Check if the document exists
        const favoriteDoc = await getDoc(favoriteDocRef);
        if (!favoriteDoc.exists()) {
            return false; // Not found in favorites
        }

        // Delete the document
        await deleteDoc(favoriteDocRef);
        return true;
    } catch (error) {
        console.error("Error removing from favorites:", error);
        throw error;
    }
};

// Check if an item is in favorites
export const checkIfFavorite = async (userEmail, itemId, type) => {
    try {
        if (!userEmail || !itemId || !type) {
            return null;
        }

        // Validate and format type
        let capitalizedType;
        if (type === 'business') {
            capitalizedType = 'Businesses';
        } else if (type === 'product') {
            capitalizedType = 'Products';
        } else if (type === 'service') {
            capitalizedType = 'Services';
        } else {
            return null;
        }

        // Reference to the specific favorite document
        const userDocRef = doc(db, "UserFavorites", userEmail);
        const favoriteDocRef = doc(collection(userDocRef, capitalizedType), itemId);

        // Get the document
        const favoriteDoc = await getDoc(favoriteDocRef);

        if (!favoriteDoc.exists()) {
            return null;
        }

        return {
            id: favoriteDoc.id,
            ...favoriteDoc.data()
        };
    } catch (error) {
        console.error("Error checking favorite status:", error);
        return null;
    }
};

// Get all favorites for a user
export const getUserFavorites = async (userEmail, type = null) => {
    try {
        if (!userEmail) {
            throw new Error("User email is required");
        }

        const userDocRef = doc(db, "UserFavorites", userEmail);

        if (type) {
            // Get favorites of a specific type
            let capitalizedType;
            if (type === 'business') {
                capitalizedType = 'Businesses';
            } else if (type === 'product') {
                capitalizedType = 'Products';
            } else if (type === 'service') {
                capitalizedType = 'Services';
            } else {
                throw new Error("Type must be 'business', 'product', or 'service'");
            }

            const subcollectionRef = collection(userDocRef, capitalizedType);
            const querySnapshot = await getDocs(subcollectionRef);

            const favorites = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return favorites;
        } else {
            // Get all favorites (from all subcollections)
            const allFavorites = {};
            const subcollectionTypes = ['Businesses', 'Products', 'Services'];

            for (const subcollectionType of subcollectionTypes) {
                const subcollectionRef = collection(userDocRef, subcollectionType);
                const querySnapshot = await getDocs(subcollectionRef);

                allFavorites[subcollectionType.toLowerCase()] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            return allFavorites;
        }
    } catch (error) {
        console.error("Error getting user favorites:", error);
        throw error;
    }
};

// Legacy function name for backward compatibility
export const getCustomerFavorites = getUserFavorites;

// Get count of favorites by type for a user
export const getFavoritesCount = async (userEmail, type = null) => {
    try {
        if (!userEmail) {
            throw new Error("User email is required");
        }

        const userDocRef = doc(db, "UserFavorites", userEmail);

        if (type) {
            // Get count of favorites of a specific type
            let capitalizedType;
            if (type === 'business') {
                capitalizedType = 'Businesses';
            } else if (type === 'product') {
                capitalizedType = 'Products';
            } else if (type === 'service') {
                capitalizedType = 'Services';
            } else {
                throw new Error("Type must be 'business', 'product', or 'service'");
            }

            const subcollectionRef = collection(userDocRef, capitalizedType);
            const querySnapshot = await getDocs(subcollectionRef);
            return querySnapshot.size;
        } else {
            // Get total count of all favorites
            const subcollectionTypes = ['Businesses', 'Products', 'Services'];
            let totalCount = 0;

            for (const subcollectionType of subcollectionTypes) {
                const subcollectionRef = collection(userDocRef, subcollectionType);
                const querySnapshot = await getDocs(subcollectionRef);
                totalCount += querySnapshot.size;
            }

            return totalCount;
        }
    } catch (error) {
        console.error("Error getting favorites count:", error);
        throw error;
    }
};

// Clear all favorites for a user
export const clearAllFavorites = async (userEmail) => {
    try {
        if (!userEmail) {
            throw new Error("User email is required");
        }

        const userDocRef = doc(db, "UserFavorites", userEmail);
        const subcollectionTypes = ['Businesses', 'Products', 'Services'];

        for (const subcollectionType of subcollectionTypes) {
            const subcollectionRef = collection(userDocRef, subcollectionType);
            const querySnapshot = await getDocs(subcollectionRef);

            // Delete all documents in the subcollection
            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
        }

        return true;
    } catch (error) {
        console.error("Error clearing all favorites:", error);
        throw error;
    }
};

// Clear favorites of a specific type for a user
export const clearFavoritesByType = async (userEmail, type) => {
    try {
        if (!userEmail || !type) {
            throw new Error("User email and type are required");
        }

        const validTypes = ['Businesses', 'Products', 'Services'];
        let capitalizedType;
        if (type === 'business') {
            capitalizedType = 'Businesses';
        } else if (type === 'product') {
            capitalizedType = 'Products';
        } else if (type === 'service') {
            capitalizedType = 'Services';
        } else {
            throw new Error("Type must be 'business', 'product', or 'service'");
        }

        const userDocRef = doc(db, "UserFavorites", userEmail);
        const subcollectionRef = collection(userDocRef, capitalizedType);
        const querySnapshot = await getDocs(subcollectionRef);

        // Delete all documents in the subcollection
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        return true;
    } catch (error) {
        console.error("Error clearing favorites by type:", error);
        throw error;
    }
};
