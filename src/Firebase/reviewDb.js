import { db } from './config';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    limit,
    startAfter,
    Timestamp
} from 'firebase/firestore';

/**
 * Add a new review for a business, product, or service
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {string} userId - ID of the user leaving the review
 * @param {string} userName - Name of the user leaving the review
 * @param {number} rating - Rating between 1-5
 * @param {string} comment - Review comment text
 * @param {string} userPhotoURL - URL of the user's profile photo (optional)
 * @param {string} orderOrBookingId - ID of the related order or booking (optional)
 * @returns {Promise<object>} The newly created review
 */
export const addReview = async (reviewType, businessId, itemId, userId, userName, rating, comment, userPhotoURL = '', orderOrBookingId = null) => {
    try {
        console.log(`📝 Adding ${reviewType} review for ${businessId}`);

        // Validate inputs
        if (!reviewType || !businessId || !userId || !userName || !rating) {
            throw new Error('Missing required review information');
        }

        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Determine the collection path based on review type
        let collectionPath;
        if (reviewType === 'business') {
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            collectionPath = `Reviews/Products/${businessId}/${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            collectionPath = `Reviews/Services/${businessId}/${itemId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Create the review object
        const reviewData = {
            userId,
            userName,
            rating,
            comment,
            userPhotoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            orderOrBookingId,
            businessResponse: null,
            status: 'active' // active, hidden, reported
        };

        // Add the review to Firestore
        const reviewsCollection = collection(db, collectionPath);
        const newReviewRef = await addDoc(reviewsCollection, reviewData);

        // Update the average rating
        await updateAverageRating(reviewType, businessId, itemId);

        return {
            id: newReviewRef.id,
            ...reviewData,
            createdAt: new Date(), // Use a JavaScript Date for immediate use
        };
    } catch (error) {
        console.error('Error adding review:', error);
        throw error;
    }
};

/**
 * Get reviews for a business, product, or service
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {number} pageSize - Number of reviews to fetch per page (default: 10)
 * @param {object} lastDoc - Last document from previous page (for pagination)
 * @returns {Promise<Array>} Array of reviews
 */
export const getReviews = async (reviewType, businessId, itemId = null, pageSize = 10, lastDoc = null) => {
    try {
        console.log(`📋 Getting ${reviewType} reviews for ${businessId}`);

        // Determine the collection path based on review type
        let collectionPath;
        if (reviewType === 'business') {
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            collectionPath = `Reviews/Products/${businessId}/${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            collectionPath = `Reviews/Services/${businessId}/${itemId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Create query to get reviews sorted by timestamp (newest first)
        let reviewsQuery;

        if (lastDoc) {
            reviewsQuery = query(
                collection(db, collectionPath),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(pageSize)
            );
        } else {
            reviewsQuery = query(
                collection(db, collectionPath),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );
        }

        // Execute query
        const reviewsSnapshot = await getDocs(reviewsQuery);

        // Format the results
        const reviews = [];
        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();

            // Convert Firestore Timestamps to JS Dates
            const createdAt = reviewData.createdAt ?
                reviewData.createdAt.toDate() :
                new Date();

            const updatedAt = reviewData.updatedAt ?
                reviewData.updatedAt.toDate() :
                new Date();

            const businessResponse = reviewData.businessResponse ? {
                ...reviewData.businessResponse,
                createdAt: reviewData.businessResponse.createdAt ?
                    reviewData.businessResponse.createdAt.toDate() :
                    null
            } : null;

            reviews.push({
                id: doc.id,
                ...reviewData,
                createdAt,
                updatedAt,
                businessResponse
            });
        });

        // Return reviews and last document for pagination
        const lastVisible = reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1];

        return {
            reviews,
            lastVisible
        };
    } catch (error) {
        console.error('Error getting reviews:', error);
        throw error;
    }
};

/**
 * Get a single review by ID
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {string} reviewId - ID of the review
 * @returns {Promise<object>} The review data
 */
export const getReviewById = async (reviewType, businessId, itemId = null, reviewId) => {
    try {
        // Determine the document path based on review type
        let docPath;
        if (reviewType === 'business') {
            docPath = `Reviews/Businesses/${businessId}/${reviewId}`;
        } else if (reviewType === 'product' && itemId) {
            docPath = `Reviews/Products/${businessId}/${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            docPath = `Reviews/Services/${businessId}/${itemId}/${reviewId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Get the review document
        const reviewDoc = await getDoc(doc(db, docPath));

        if (!reviewDoc.exists()) {
            throw new Error('Review not found');
        }

        const reviewData = reviewDoc.data();

        // Convert Firestore Timestamps to JS Dates
        const createdAt = reviewData.createdAt ?
            reviewData.createdAt.toDate() :
            new Date();

        const updatedAt = reviewData.updatedAt ?
            reviewData.updatedAt.toDate() :
            new Date();

        const businessResponse = reviewData.businessResponse ? {
            ...reviewData.businessResponse,
            createdAt: reviewData.businessResponse.createdAt ?
                reviewData.businessResponse.createdAt.toDate() :
                null
        } : null;

        return {
            id: reviewDoc.id,
            ...reviewData,
            createdAt,
            updatedAt,
            businessResponse
        };
    } catch (error) {
        console.error('Error getting review by ID:', error);
        throw error;
    }
};

/**
 * Update an existing review
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {string} reviewId - ID of the review to update
 * @param {object} updateData - Data to update (rating, comment)
 * @returns {Promise<object>} The updated review
 */
export const updateReview = async (reviewType, businessId, itemId, reviewId, updateData) => {
    try {
        console.log(`✏️ Updating ${reviewType} review ${reviewId}`);

        // Determine the document path based on review type
        let docPath;
        if (reviewType === 'business') {
            docPath = `Reviews/Businesses/${businessId}/${reviewId}`;
        } else if (reviewType === 'product' && itemId) {
            docPath = `Reviews/Products/${businessId}/${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            docPath = `Reviews/Services/${businessId}/${itemId}/${reviewId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Validate rating if provided
        if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Update the review
        const reviewRef = doc(db, docPath);

        // Add updatedAt timestamp
        const dataToUpdate = {
            ...updateData,
            updatedAt: serverTimestamp()
        };

        await updateDoc(reviewRef, dataToUpdate);

        // Update average rating if the rating changed
        if (updateData.rating) {
            await updateAverageRating(reviewType, businessId, itemId);
        }

        // Get the updated review
        const updatedReview = await getDoc(reviewRef);

        return {
            id: updatedReview.id,
            ...updatedReview.data()
        };
    } catch (error) {
        console.error('Error updating review:', error);
        throw error;
    }
};

/**
 * Delete a review
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {string} reviewId - ID of the review to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteReview = async (reviewType, businessId, itemId, reviewId) => {
    try {
        console.log(`🗑️ Deleting ${reviewType} review ${reviewId}`);

        // Determine the document path based on review type
        let docPath;
        if (reviewType === 'business') {
            docPath = `Reviews/Businesses/${businessId}/${reviewId}`;
        } else if (reviewType === 'product' && itemId) {
            docPath = `Reviews/Products/${businessId}/${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            docPath = `Reviews/Services/${businessId}/${itemId}/${reviewId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Delete the review
        await deleteDoc(doc(db, docPath));

        // Update average rating
        await updateAverageRating(reviewType, businessId, itemId);

        return true;
    } catch (error) {
        console.error('Error deleting review:', error);
        throw error;
    }
};

/**
 * Add a business response to a review
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @param {string} reviewId - ID of the review
 * @param {string} responseText - Text of the business response
 * @returns {Promise<object>} The updated review with response
 */
export const respondToReview = async (reviewType, businessId, itemId, reviewId, responseText) => {
    try {
        console.log(`💬 Adding response to ${reviewType} review ${reviewId}`);

        if (!responseText.trim()) {
            throw new Error('Response text cannot be empty');
        }

        // Determine the document path based on review type
        let docPath;
        if (reviewType === 'business') {
            docPath = `Reviews/Businesses/${businessId}/${reviewId}`;
        } else if (reviewType === 'product' && itemId) {
            docPath = `Reviews/Products/${businessId}/${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            docPath = `Reviews/Services/${businessId}/${itemId}/${reviewId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Create the response object
        const businessResponse = {
            text: responseText,
            createdAt: serverTimestamp()
        };

        // Update the review with the response
        const reviewRef = doc(db, docPath);
        await updateDoc(reviewRef, {
            businessResponse,
            updatedAt: serverTimestamp()
        });

        // Get the updated review
        const updatedReview = await getDoc(reviewRef);

        const reviewData = updatedReview.data();

        // Convert Firestore Timestamps to JS Dates
        const createdAt = reviewData.createdAt ?
            reviewData.createdAt.toDate() :
            new Date();

        const updatedAt = reviewData.updatedAt ?
            reviewData.updatedAt.toDate() :
            new Date();

        const responseData = reviewData.businessResponse ? {
            ...reviewData.businessResponse,
            createdAt: reviewData.businessResponse.createdAt ?
                reviewData.businessResponse.createdAt.toDate() :
                new Date()
        } : null;

        return {
            id: updatedReview.id,
            ...reviewData,
            createdAt,
            updatedAt,
            businessResponse: responseData
        };
    } catch (error) {
        console.error('Error adding response to review:', error);
        throw error;
    }
};

/**
 * Calculate and update the average rating for a business, product, or service
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @returns {Promise<number>} The new average rating
 */
export const updateAverageRating = async (reviewType, businessId, itemId = null) => {
    try {
        console.log(`🔢 Updating average rating for ${reviewType} ${businessId}`);

        // Determine the collection path based on review type
        let collectionPath;
        if (reviewType === 'business') {
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            collectionPath = `Reviews/Products/${businessId}/${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            collectionPath = `Reviews/Services/${businessId}/${itemId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Get all reviews for the entity
        const reviewsQuery = query(collection(db, collectionPath));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        // Calculate average rating
        let totalRating = 0;
        let reviewCount = 0;

        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();
            if (reviewData.rating) {
                totalRating += reviewData.rating;
                reviewCount++;
            }
        });

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

        // Update the entity with the new average rating
        if (reviewType === 'business') {
            // Update business document
            const businessRef = doc(db, 'Businesses', businessId);
            await updateDoc(businessRef, {
                rating: roundedAverage,
                reviewCount
            });
        } else if (reviewType === 'product') {
            // Update product document
            const productRef = doc(db, 'Products', businessId, 'ActiveProducts', itemId);
            await updateDoc(productRef, {
                rating: roundedAverage,
                reviewCount
            });
        } else if (reviewType === 'service') {
            // Update service document
            const serviceRef = doc(db, 'Services', businessId, 'ActiveServices', itemId);
            await updateDoc(serviceRef, {
                rating: roundedAverage,
                reviewCount
            });
        }

        return {
            averageRating: roundedAverage,
            reviewCount
        };
    } catch (error) {
        console.error('Error updating average rating:', error);
        throw error;
    }
};

/**
 * Get all reviews for a specific user
 * @param {string} userId - ID of the user
 * @param {number} pageSize - Number of reviews to fetch per page (default: 10)
 * @param {object} lastDoc - Last document from previous page (for pagination)
 * @returns {Promise<Array>} Array of user's reviews
 */
export const getUserReviews = async (userId, pageSize = 10, lastDoc = null) => {
    try {
        console.log(`👤 Getting reviews for user ${userId}`);

        // Function to get reviews from a specific collection
        const getReviewsFromCollection = async (collectionPath) => {
            let reviewsQuery;

            if (lastDoc) {
                reviewsQuery = query(
                    collection(db, collectionPath),
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(pageSize)
                );
            } else {
                reviewsQuery = query(
                    collection(db, collectionPath),
                    where('userId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(pageSize)
                );
            }

            const snapshot = await getDocs(reviewsQuery);
            const reviews = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // Convert Firestore Timestamps to JS Dates
                const createdAt = data.createdAt ?
                    data.createdAt.toDate() :
                    new Date();

                const updatedAt = data.updatedAt ?
                    data.updatedAt.toDate() :
                    new Date();

                const businessResponse = data.businessResponse ? {
                    ...data.businessResponse,
                    createdAt: data.businessResponse.createdAt ?
                        data.businessResponse.createdAt.toDate() :
                        null
                } : null;

                reviews.push({
                    id: doc.id,
                    ...data,
                    createdAt,
                    updatedAt,
                    businessResponse
                });
            });

            return reviews;
        };

        // We need to get reviews from multiple collections
        // For business reviews (direct path)
        const businessReviewsQuery = query(
            collection(db, 'Reviews/Businesses'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        // For product and service reviews, we'd need to query each business/product or business/service combination
        // This is complex and would require multiple queries or a different data structure
        // For simplicity, let's assume we have a user's reviews index collection

        // Create an array to store all reviews
        const allReviews = [];

        // Get reviews from the user's reviews index
        const userReviewsRef = collection(db, `UserReviews/${userId}/Reviews`);
        const userReviewsSnapshot = await getDocs(userReviewsRef);

        // For each review reference in the user's index, get the actual review
        const reviewPromises = [];
        userReviewsSnapshot.forEach(doc => {
            const reviewRef = doc.data();

            // Construct the path to the actual review
            let reviewPath;
            if (reviewRef.type === 'business') {
                reviewPath = `Reviews/Businesses/${reviewRef.businessId}/${reviewRef.reviewId}`;
            } else if (reviewRef.type === 'product') {
                reviewPath = `Reviews/Products/${reviewRef.businessId}/${reviewRef.itemId}/${reviewRef.reviewId}`;
            } else if (reviewRef.type === 'service') {
                reviewPath = `Reviews/Services/${reviewRef.businessId}/${reviewRef.itemId}/${reviewRef.reviewId}`;
            }

            // Get the actual review
            if (reviewPath) {
                reviewPromises.push(getDoc(doc(db, reviewPath))
                    .then(reviewDoc => {
                        if (reviewDoc.exists()) {
                            const reviewData = reviewDoc.data();

                            // Convert Firestore Timestamps to JS Dates
                            const createdAt = reviewData.createdAt ?
                                reviewData.createdAt.toDate() :
                                new Date();

                            const updatedAt = reviewData.updatedAt ?
                                reviewData.updatedAt.toDate() :
                                new Date();

                            const businessResponse = reviewData.businessResponse ? {
                                ...reviewData.businessResponse,
                                createdAt: reviewData.businessResponse.createdAt ?
                                    reviewData.businessResponse.createdAt.toDate() :
                                    null
                            } : null;

                            return {
                                id: reviewDoc.id,
                                ...reviewData,
                                type: reviewRef.type,
                                businessId: reviewRef.businessId,
                                itemId: reviewRef.itemId,
                                createdAt,
                                updatedAt,
                                businessResponse
                            };
                        }
                        return null;
                    })
                );
            }
        });

        // Wait for all review promises to resolve
        const reviewsResults = await Promise.all(reviewPromises);

        // Add non-null reviews to the result array
        reviewsResults.forEach(review => {
            if (review) {
                allReviews.push(review);
            }
        });

        // Sort by createdAt (newest first)
        allReviews.sort((a, b) => b.createdAt - a.createdAt);

        // Return the sorted reviews
        return allReviews;
    } catch (error) {
        console.error('Error getting user reviews:', error);
        throw error;
    }
};

/**
 * Get review summary statistics for a business, product, or service
 * @param {string} reviewType - "business", "product", or "service"
 * @param {string} businessId - ID of the business
 * @param {string} itemId - ID of the product or service (if applicable)
 * @returns {Promise<object>} Review statistics
 */
export const getReviewStats = async (reviewType, businessId, itemId = null) => {
    try {
        console.log(`📊 Getting review stats for ${reviewType} ${businessId}`);

        // Determine the collection path based on review type
        let collectionPath;
        if (reviewType === 'business') {
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            collectionPath = `Reviews/Products/${businessId}/${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            collectionPath = `Reviews/Services/${businessId}/${itemId}`;
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Get all reviews for the entity
        const reviewsQuery = query(collection(db, collectionPath));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        // Calculate statistics
        let totalRating = 0;
        let reviewCount = 0;
        const ratingCounts = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };

        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();
            if (reviewData.rating) {
                totalRating += reviewData.rating;
                reviewCount++;

                // Count reviews by rating
                if (reviewData.rating >= 1 && reviewData.rating <= 5) {
                    ratingCounts[Math.floor(reviewData.rating)]++;
                }
            }
        });

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

        // Calculate rating percentages
        const ratingPercentages = {};
        for (let i = 1; i <= 5; i++) {
            ratingPercentages[i] = reviewCount > 0 ? (ratingCounts[i] / reviewCount) * 100 : 0;
        }

        return {
            averageRating: roundedAverage,
            reviewCount,
            ratingCounts,
            ratingPercentages
        };
    } catch (error) {
        console.error('Error getting review stats:', error);
        throw error;
    }
};

/**
 * Get the most recent reviews across all entities for a specific business
 * @param {string} businessId - ID of the business
 * @param {number} limit - Number of reviews to fetch
 * @returns {Promise<Array>} Array of recent reviews
 */
export const getRecentBusinessReviews = async (businessId, limit = 5) => {
    try {
        console.log(`🕒 Getting recent reviews for business ${businessId}`);

        const recentReviews = [];

        // Get business reviews
        const businessReviewsPath = `Reviews/Businesses/${businessId}`;
        const businessReviewsQuery = query(
            collection(db, businessReviewsPath),
            orderBy('createdAt', 'desc'),
            limit(limit)
        );

        const businessReviewsSnapshot = await getDocs(businessReviewsQuery);

        businessReviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();

            // Convert Firestore Timestamps to JS Dates
            const createdAt = reviewData.createdAt ?
                reviewData.createdAt.toDate() :
                new Date();

            const updatedAt = reviewData.updatedAt ?
                reviewData.updatedAt.toDate() :
                new Date();

            const businessResponse = reviewData.businessResponse ? {
                ...reviewData.businessResponse,
                createdAt: reviewData.businessResponse.createdAt ?
                    reviewData.businessResponse.createdAt.toDate() :
                    null
            } : null;

            recentReviews.push({
                id: doc.id,
                ...reviewData,
                type: 'business',
                businessId,
                createdAt,
                updatedAt,
                businessResponse
            });
        });

        // TODO: Get product and service reviews
        // This would require querying all products and services for the business
        // For now, we'll just return the business reviews

        return recentReviews;
    } catch (error) {
        console.error('Error getting recent business reviews:', error);
        throw error;
    }
};

/**
 * Track when a user has reviewed a product or service after a purchase or booking
 * @param {string} userId - ID of the user
 * @param {string} entityType - "product" or "service"
 * @param {string} entityId - ID of the product or service
 * @param {string} orderId - ID of the order or booking
 * @returns {Promise<boolean>} Success status
 */
export const markAsReviewed = async (userId, entityType, entityId, orderId) => {
    try {
        console.log(`✓ Marking ${entityType} ${entityId} as reviewed by user ${userId}`);

        // Create a document in the user's reviewed items collection
        const reviewedRef = doc(db, `Users/${userId}/ReviewedItems/${entityType}_${entityId}`);

        await updateDoc(reviewedRef, {
            entityType,
            entityId,
            orderId,
            reviewedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error marking as reviewed:', error);
        throw error;
    }
};

/**
 * Check if a user has already reviewed a product or service
 * @param {string} userId - ID of the user
 * @param {string} entityType - "product" or "service"
 * @param {string} entityId - ID of the product or service
 * @returns {Promise<boolean>} Whether the user has already reviewed this entity
 */
export const hasUserReviewed = async (userId, entityType, entityId) => {
    try {
        // Check if the user has a record for this entity in their ReviewedItems collection
        const reviewedRef = doc(db, `Users/${userId}/ReviewedItems/${entityType}_${entityId}`);
        const reviewedDoc = await getDoc(reviewedRef);

        return reviewedDoc.exists();
    } catch (error) {
        console.error('Error checking if user reviewed:', error);
        throw error;
    }
};

export default {
    addReview,
    getReviews,
    getReviewById,
    updateReview,
    deleteReview,
    respondToReview,
    updateAverageRating,
    getUserReviews,
    getReviewStats,
    getRecentBusinessReviews,
    markAsReviewed,
    hasUserReviewed
};
