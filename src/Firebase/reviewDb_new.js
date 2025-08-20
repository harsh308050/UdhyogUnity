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

// Helper: query alternate collections (Rating / Ratings) for reviews if the Reviews/ path is missing
const queryAlternateRatingCollections = async (reviewType, businessId, itemId = null, pageSize = 10, lastDoc = null) => {
    try {
        // Check multiple possible collection names for ratings/reviews
        const collectionNames = ['Ratings', 'Rating', 'reviews', 'Reviews'];

        for (const colName of collectionNames) {
            console.log(`Checking alternate collection: ${colName} for ${reviewType} reviews`);

            // Use the business ID directly without variations
            const colRef = collection(db, colName);

            try {
                // Try a simpler query first (without orderBy) to avoid index requirements
                // This is used as a fallback when indexes aren't set up
                let simpleQuery;
                if (reviewType === 'business') {
                    simpleQuery = query(colRef, where('businessId', '==', businessId));
                } else if (reviewType === 'product' && itemId) {
                    simpleQuery = query(colRef, where('businessId', '==', businessId), where('itemId', '==', itemId));
                } else if (reviewType === 'service' && itemId) {
                    simpleQuery = query(colRef, where('businessId', '==', businessId), where('itemId', '==', itemId));
                } else {
                    continue;
                }

                const simpleSnap = await getDocs(simpleQuery);

                if (!simpleSnap.empty) {
                    console.log(`Found ${simpleSnap.docs.length} reviews in ${colName} collection (using simple query)`);
                    const reviews = [];

                    // Process results and sort manually since we're not using orderBy in the query
                    simpleSnap.forEach(d => {
                        const rd = d.data();
                        console.log(`Review from ${colName}:`, d.id, rd);
                        reviews.push({ id: d.id, ...rd });
                    });

                    // Manual sort by createdAt (newest first)
                    reviews.sort((a, b) => {
                        const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                        const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                        return dateB - dateA;
                    });

                    // Manual pagination
                    const paginatedReviews = reviews.slice(0, pageSize);
                    return {
                        reviews: paginatedReviews,
                        lastVisible: paginatedReviews.length > 0 ? simpleSnap.docs.find(d => d.id === paginatedReviews[paginatedReviews.length - 1].id) : null
                    };
                }

                // If no results from simple query, try with the more complex one that requires an index
                try {
                    let complexQuery;
                    if (reviewType === 'business') {
                        complexQuery = query(colRef, where('businessId', '==', businessId), orderBy('createdAt', 'desc'), limit(pageSize));
                    } else if (reviewType === 'product' && itemId) {
                        complexQuery = query(colRef, where('businessId', '==', businessId), where('itemId', '==', itemId), orderBy('createdAt', 'desc'), limit(pageSize));
                    } else if (reviewType === 'service' && itemId) {
                        complexQuery = query(colRef, where('businessId', '==', businessId), where('itemId', '==', itemId), orderBy('createdAt', 'desc'), limit(pageSize));
                    } else {
                        continue;
                    }

                    const complexSnap = await getDocs(complexQuery);
                    if (!complexSnap.empty) {
                        console.log(`Found ${complexSnap.docs.length} reviews in ${colName} collection (using complex query)`);
                        const reviews = [];
                        complexSnap.forEach(d => {
                            const rd = d.data();
                            console.log(`Review from ${colName} (complex query):`, d.id, rd);
                            reviews.push({ id: d.id, ...rd });
                        });

                        const lastVisible = complexSnap.docs[complexSnap.docs.length - 1];
                        return { reviews, lastVisible };
                    }
                } catch (complexError) {
                    // Skip complex query errors and try the next approach
                    console.log(`Complex query failed in ${colName}:`, complexError.message);
                }

                // If no items with businessId, try looking for specific fields
                try {
                    // Try with 'businessEmail' instead of 'businessId'
                    let emailQuery = query(colRef, where('businessEmail', '==', businessId));
                    let emailSnap = await getDocs(emailQuery);

                    if (!emailSnap.empty) {
                        console.log(`Found ${emailSnap.docs.length} reviews in ${colName} using businessEmail field`);
                        const reviews = [];

                        emailSnap.forEach(d => {
                            const rd = d.data();
                            console.log(`Review using businessEmail:`, d.id, rd);
                            reviews.push({ id: d.id, ...rd });
                        });

                        return {
                            reviews: reviews.slice(0, pageSize),
                            lastVisible: null
                        };
                    }
                } catch (emailError) {
                    console.log(`Email field query failed:`, emailError.message);
                }

            } catch (queryError) {
                // If we get an index error, log it with instructions
                if (queryError.message && queryError.message.includes('index')) {
                    console.log(`Query in ${colName} requires an index. To fix this, you need to create the appropriate index in Firebase.`);
                    console.log(`Error details: ${queryError.message}`);
                } else {
                    console.log(`Query failed in ${colName}:`, queryError);
                }

                // Continue to try other collections
            }
        }

        // Check for business-specific collections
        try {
            const businessReviewsRef = collection(db, `BusinessReviews/${businessId}/Reviews`);
            const businessReviewsSnap = await getDocs(businessReviewsRef);

            if (!businessReviewsSnap.empty) {
                console.log(`Found ${businessReviewsSnap.docs.length} reviews in BusinessReviews/${businessId}/Reviews`);
                const reviews = [];

                businessReviewsSnap.forEach(d => {
                    const rd = d.data();
                    console.log(`Review from BusinessReviews:`, d.id, rd);
                    reviews.push({ id: d.id, ...rd });
                });

                return {
                    reviews: reviews.slice(0, pageSize),
                    lastVisible: null
                };
            }
        } catch (businessReviewsError) {
            console.log('Error checking BusinessReviews collection:', businessReviewsError.message);
        }
    } catch (error) {
        console.error('Error querying alternate Rating collections:', error);
    }

    // If we get here, check if there's a business document with rating data
    try {
        const businessDoc = await getDoc(doc(db, 'Businesses', businessId));
        if (businessDoc.exists()) {
            const businessData = businessDoc.data();
        }
    } catch (businessError) {
        console.error('Error checking business document:', businessError);
    }

    return { reviews: [], lastVisible: null };
};

/**
 * Try to resolve a business identifier (which may be an email/document id or a businessName slug)
 * to the actual Businesses collection document id (typically the business email). Returns null if not found.
 */
const resolveBusinessDocumentId = async (businessIdentifier) => {
    if (!businessIdentifier) return null;

    try {
        // If it looks like an email / document id, try it directly first
        if (businessIdentifier.includes('@')) {
            const directDoc = await getDoc(doc(db, 'Businesses', businessIdentifier));
            if (directDoc.exists()) return businessIdentifier;
        }

        // Try using it directly as a doc id (some code uses businessId as doc id)
        const directDoc2 = await getDoc(doc(db, 'Businesses', businessIdentifier));
        if (directDoc2.exists()) return businessIdentifier;

        // Otherwise, search Businesses collection for matching businessName or businessId fields
        const businessesRef = collection(db, 'Businesses');
        // Search by businessId field
        let q = query(businessesRef, where('businessId', '==', businessIdentifier));
        let snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].id;

        // Search by businessName (normalized)
        q = query(businessesRef, where('businessName', '==', businessIdentifier));
        snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].id;

        // As a last resort, try a case-insensitive match by fetching small set and comparing
        const allBusinesses = await getDocs(businessesRef);
        for (const b of allBusinesses.docs) {
            const data = b.data() || {};
            if (data.businessName && data.businessName.toLowerCase() === businessIdentifier.toLowerCase()) return b.id;
            if (data.businessId && String(data.businessId).toLowerCase() === String(businessIdentifier).toLowerCase()) return b.id;
        }

        return null;
    } catch (error) {
        console.error('Error resolving business identifier:', businessIdentifier, error);
        return null;
    }
};

/**
 * Get service info and ensure it has a valid rating and review count
 * This is used to fix services that don't have proper rating values
 */
const ensureServiceRating = async (businessId, serviceId, defaultRating = 0, defaultCount = 0) => {
    try {
        const serviceRef = doc(db, 'Services', businessId, 'Active', serviceId);
        const serviceSnap = await getDoc(serviceRef);

        if (serviceSnap.exists()) {
            const serviceData = serviceSnap.data();
            let needsUpdate = false;
            let updateData = {};

            // Check if rating is missing or invalid
            if (typeof serviceData.rating !== 'number' || isNaN(serviceData.rating)) {
                console.log(`Service ${serviceId} has invalid rating: ${serviceData.rating}, setting to ${defaultRating}`);
                updateData.rating = defaultRating;
                needsUpdate = true;
            }

            // Check if reviewCount is missing or invalid
            if (typeof serviceData.reviewCount !== 'number' || isNaN(serviceData.reviewCount)) {
                console.log(`Service ${serviceId} has invalid reviewCount: ${serviceData.reviewCount}, setting to ${defaultCount}`);
                updateData.reviewCount = defaultCount;
                needsUpdate = true;
            }

            // Update if needed
            if (needsUpdate) {
                console.log(`Updating service ${serviceId} with fixed rating data:`, updateData);
                await updateDoc(serviceRef, updateData);

                // Return the updated service data
                return {
                    ...serviceData,
                    ...updateData
                };
            }

            return serviceData;
        }
        return null;
    } catch (error) {
        console.error(`Error ensuring service rating: ${error.message}`);
        return null;
    }
};
const findProductOwner = async (productId) => {
    if (!productId) return null;
    try {
        const productsRoot = collection(db, 'Products');
        const businessesSnap = await getDocs(productsRoot);
        for (const bdoc of businessesSnap.docs) {
            const businessKey = bdoc.id;
            // Check Available
            const availRef = doc(db, 'Products', businessKey, 'Available', productId);
            const availSnap = await getDoc(availRef);
            if (availSnap.exists()) return businessKey;

            // Check Unavailable
            const unavailRef = doc(db, 'Products', businessKey, 'Unavailable', productId);
            const unavailSnap = await getDoc(unavailRef);
            if (unavailSnap.exists()) return businessKey;
        }
        return null;
    } catch (error) {
        console.error('Error finding product owner for', productId, error);
        return null;
    }
};

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
        console.log(`📝 Adding ${reviewType} review for ${businessId}${itemId ? ', item: ' + itemId : ''}`);

        // Validate inputs
        if (!reviewType || !businessId || !userId || !userName || !rating) {
            throw new Error('Missing required review information');
        }

        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        // For products, validate that the product exists before proceeding
        if (reviewType === 'product' && itemId) {
            // Resolve business doc id (some parts of the app use businessName or businessId)
            const resolvedBusinessId = await resolveBusinessDocumentId(businessId) || businessId;
            console.log(`Verifying product exists: resolvedBusinessId=${resolvedBusinessId}, original=${businessId}, product=${itemId}`);

            let availableDoc = null;
            let unavailableDoc = null;
            let usedBusinessKey = resolvedBusinessId;

            const availableProductRef = doc(db, 'Products', resolvedBusinessId, 'Available', itemId);
            const unavailableProductRef = doc(db, 'Products', resolvedBusinessId, 'Unavailable', itemId);

            availableDoc = await getDoc(availableProductRef);
            unavailableDoc = await getDoc(unavailableProductRef);

            if (!availableDoc.exists() && !unavailableDoc.exists()) {
                // Fallback: search across all Products to find which business owns this productId
                const owner = await findProductOwner(itemId);
                if (owner) {
                    usedBusinessKey = owner;
                    availableDoc = await getDoc(doc(db, 'Products', owner, 'Available', itemId));
                    unavailableDoc = await getDoc(doc(db, 'Products', owner, 'Unavailable', itemId));
                }
            }

            if (!availableDoc?.exists() && !unavailableDoc?.exists()) {
                console.error(`Product not found in either Available or Unavailable collections for resolved business id:`, resolvedBusinessId);
                throw new Error(`Product with ID ${itemId} not found for business ${businessId}`);
            }

            console.log(`Product verified to exist for business key ${usedBusinessKey}: ${availableDoc.exists() ? 'Available' : 'Unavailable'}`);
        }

        // Determine the collection path based on review type
        let collectionPath;
        if (reviewType === 'business') {
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            collectionPath = `Reviews/Products/${businessId}_${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                console.log(`Using business email directly for service review: ${businessId}`);
                collectionPath = `Reviews/Services/${businessId}_${itemId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                console.log(`Using business identifier for service review: ${businessIdentifier}`);
                collectionPath = `Reviews/Services/${businessIdentifier}_${itemId}`;
            }
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
            // For business reviews, use Reviews/Businesses/businessId
            collectionPath = `Reviews/Businesses/${businessId}`;
        } else if (reviewType === 'product' && itemId) {
            // For product reviews, use structure observed in Firebase:
            // Reviews/Products/businessEmail_productId
            collectionPath = `Reviews/Products/${businessId}_${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                console.log(`Using business email directly for service review: ${businessId}`);
                collectionPath = `Reviews/Services/${businessId}_${itemId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                console.log(`Using business identifier for service review: ${businessIdentifier}`);
                collectionPath = `Reviews/Services/${businessIdentifier}_${itemId}`;
            }
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Create query to get reviews sorted by timestamp (newest first)
        let reviewsQuery;

        try {
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

            // If no reviews under Reviews/... path, try alternate Rating collections
            if (reviewsSnapshot.empty) {
                console.log(`No reviews found in ${collectionPath}, checking alternate collection`);

                // Check once with the direct business ID - no variations or multiple attempts
                const alt = await queryAlternateRatingCollections(reviewType, businessId, itemId, pageSize, lastDoc);

                if (alt.reviews && alt.reviews.length > 0) {
                    console.log(`Found ${alt.reviews.length} reviews in alternate collection`);
                    return {
                        reviews: alt.reviews,
                        lastVisible: alt.lastVisible
                    };
                } else {
                    console.log(`No reviews found in any collection for business ${businessId}`);
                }
            }

            // Format the results
            const reviews = [];
            reviewsSnapshot.forEach(doc => {
                const reviewData = doc.data();
                console.log(`Found review in ${collectionPath}:`, doc.id, reviewData);

                // Convert Firestore Timestamps to JS Dates
                const createdAt = reviewData.createdAt ?
                    (reviewData.createdAt.toDate ? reviewData.createdAt.toDate() : new Date(reviewData.createdAt)) :
                    new Date();

                const updatedAt = reviewData.updatedAt ?
                    (reviewData.updatedAt.toDate ? reviewData.updatedAt.toDate() : new Date(reviewData.updatedAt)) :
                    new Date();

                const businessResponse = reviewData.businessResponse ? {
                    ...reviewData.businessResponse,
                    createdAt: reviewData.businessResponse.createdAt ?
                        (reviewData.businessResponse.createdAt.toDate ? reviewData.businessResponse.createdAt.toDate() : new Date(reviewData.businessResponse.createdAt)) :
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

            // Return reviews and last document for pagination (guard when empty)
            const lastVisible = reviewsSnapshot.docs.length > 0 ? reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1] : null;

            // If we found reviews in the canonical path, return them
            if (reviews.length > 0) {
                return {
                    reviews,
                    lastVisible
                };
            }
        } catch (error) {
            console.error(`Error querying ${collectionPath}:`, error);
        }

        // If we got here, try checking the alternate collections
        console.log(`Trying alternate collections for ${reviewType} reviews`);
        const alt = await queryAlternateRatingCollections(reviewType, businessId, itemId, pageSize, lastDoc);

        if (alt.reviews && alt.reviews.length > 0) {
            console.log(`Found ${alt.reviews.length} reviews in alternate collection`);
            return {
                reviews: alt.reviews,
                lastVisible: alt.lastVisible
            };
        }

        // Check if we have a Ratings collection at the root level
        try {
            const ratingsRef = collection(db, 'Ratings');
            let ratingsQuery;

            if (reviewType === 'business') {
                ratingsQuery = query(
                    ratingsRef,
                    where('businessId', '==', businessId),
                    limit(pageSize)
                );
            } else if ((reviewType === 'product' || reviewType === 'service') && itemId) {
                ratingsQuery = query(
                    ratingsRef,
                    where('businessId', '==', businessId),
                    where('itemId', '==', itemId),
                    limit(pageSize)
                );
            }

            if (ratingsQuery) {
                const ratingsSnapshot = await getDocs(ratingsQuery);
                if (!ratingsSnapshot.empty) {
                    console.log(`Found ${ratingsSnapshot.size} reviews in root Ratings collection`);

                    const reviews = [];
                    ratingsSnapshot.forEach(doc => {
                        const reviewData = doc.data();
                        console.log(`Found review in Ratings collection:`, doc.id, reviewData);

                        reviews.push({
                            id: doc.id,
                            ...reviewData,
                            createdAt: reviewData.createdAt ?
                                (reviewData.createdAt.toDate ? reviewData.createdAt.toDate() : new Date(reviewData.createdAt)) :
                                new Date(),
                            updatedAt: reviewData.updatedAt ?
                                (reviewData.updatedAt.toDate ? reviewData.updatedAt.toDate() : new Date(reviewData.updatedAt)) :
                                new Date(),
                            businessResponse: reviewData.businessResponse || null
                        });
                    });

                    const lastVisible = ratingsSnapshot.docs.length > 0 ? ratingsSnapshot.docs[ratingsSnapshot.docs.length - 1] : null;
                    return {
                        reviews,
                        lastVisible
                    };
                }
            }
        } catch (ratingsError) {
            console.error('Error checking root Ratings collection:', ratingsError);
        }

        // If we get to this point, check if there's a business document with ratings information
        try {
            const businessDoc = await getDoc(doc(db, 'Businesses', businessId));
            if (businessDoc.exists()) {
                const businessData = businessDoc.data();


            }
        } catch (businessError) {
            console.error('Error checking business document:', businessError);
        }

        // As a last resort, return an empty result
        console.log(`No reviews found for ${businessId} in any collection`);
        return {
            reviews: [],
            lastVisible: null
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
            docPath = `Reviews/Products/${businessId}_${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                docPath = `Reviews/Services/${businessId}_${itemId}/${reviewId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                docPath = `Reviews/Services/${businessIdentifier}_${itemId}/${reviewId}`;
            }
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
            docPath = `Reviews/Products/${businessId}_${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                docPath = `Reviews/Services/${businessId}_${itemId}/${reviewId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                docPath = `Reviews/Services/${businessIdentifier}_${itemId}/${reviewId}`;
            }
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
            docPath = `Reviews/Products/${businessId}_${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                docPath = `Reviews/Services/${businessId}_${itemId}/${reviewId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                docPath = `Reviews/Services/${businessIdentifier}_${itemId}/${reviewId}`;
            }
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
            docPath = `Reviews/Products/${businessId}_${itemId}/${reviewId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                docPath = `Reviews/Services/${businessId}_${itemId}/${reviewId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                docPath = `Reviews/Services/${businessIdentifier}_${itemId}/${reviewId}`;
            }
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
            collectionPath = `Reviews/Products/${businessId}_${itemId}`;
        } else if (reviewType === 'service' && itemId) {
            // For services, first check if businessId looks like an email
            if (businessId.includes('@')) {
                console.log(`Using business email directly for service review: ${businessId}`);
                collectionPath = `Reviews/Services/${businessId}_${itemId}`;
            } else {
                // Try to resolve the business email from businessId
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                const businessIdentifier = resolvedBusinessId || businessId;
                console.log(`Using business identifier for service review: ${businessIdentifier}`);
                collectionPath = `Reviews/Services/${businessIdentifier}_${itemId}`;
            }
        } else {
            throw new Error('Invalid review type or missing item ID');
        }

        // Get all reviews for the entity
        const reviewsQuery = query(collection(db, collectionPath));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        // Calculate average rating
        let totalRating = 0;
        let reviewCount = 0;

        console.log(`Found ${reviewsSnapshot.size} reviews in ${collectionPath}`);

        // Log all reviews for debugging purposes
        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();
            console.log(`Review ${doc.id}: rating=${reviewData.rating}, user=${reviewData.userName}`);

            if (reviewData.rating) {
                totalRating += reviewData.rating;
                reviewCount++;
            }
        });

        console.log(`Total rating: ${totalRating}, count: ${reviewCount}`);
        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
        console.log(`Calculated average rating: ${roundedAverage} from ${reviewCount} reviews`);

        // Update the entity with the new average rating
        if (reviewType === 'business') {
            // Update business document
            const businessRef = doc(db, 'Businesses', businessId);
            await updateDoc(businessRef, {
                rating: roundedAverage,
                reviewCount
            });
        } else if (reviewType === 'product') {
            // First check if the product is in the Available or Unavailable subcollection
            try {
                const resolvedBusinessId = await resolveBusinessDocumentId(businessId) || businessId;
                console.log(`Checking product existence for business (resolved): ${resolvedBusinessId}, original: ${businessId}, product: ${itemId}`);

                // Try Available collection first
                let updated = false;
                const availableProductRef = doc(db, 'Products', resolvedBusinessId, 'Available', itemId);
                const availableProductDoc = await getDoc(availableProductRef);

                if (availableProductDoc.exists()) {
                    // Update product in Available subcollection
                    console.log(`Updating product in Available collection: ${resolvedBusinessId}/Available/${itemId}`);
                    await updateDoc(availableProductRef, {
                        rating: roundedAverage,
                        reviewCount
                    });
                    updated = true;
                } else {
                    // Try the Unavailable subcollection
                    console.log(`Product not found in Available, checking Unavailable: ${resolvedBusinessId}/Unavailable/${itemId}`);
                    const unavailableProductRef = doc(db, 'Products', resolvedBusinessId, 'Unavailable', itemId);
                    const unavailableProductDoc = await getDoc(unavailableProductRef);

                    if (unavailableProductDoc.exists()) {
                        console.log(`Updating product in Unavailable collection: ${resolvedBusinessId}/Unavailable/${itemId}`);
                        await updateDoc(unavailableProductRef, {
                            rating: roundedAverage,
                            reviewCount
                        });
                        updated = true;
                    }
                }

                // If still not updated, search across Products for owner
                if (!updated) {
                    const owner = await findProductOwner(itemId);
                    if (owner) {
                        const availRef2 = doc(db, 'Products', owner, 'Available', itemId);
                        const availSnap2 = await getDoc(availRef2);
                        if (availSnap2.exists()) {
                            await updateDoc(availRef2, { rating: roundedAverage, reviewCount });
                            updated = true;
                        } else {
                            const unavailRef2 = doc(db, 'Products', owner, 'Unavailable', itemId);
                            const unavailSnap2 = await getDoc(unavailRef2);
                            if (unavailSnap2.exists()) {
                                await updateDoc(unavailRef2, { rating: roundedAverage, reviewCount });
                                updated = true;
                            }
                        }
                    }
                }

                if (!updated) {
                    console.error(`Product not found in either Available or Unavailable collections for resolved business id:`, resolvedBusinessId);
                    throw new Error(`Product with ID ${itemId} not found for business ${businessId}`);
                }
                // After updating the product rating, recompute the business-level rating
                try {
                    // Fetch all products (Available + Unavailable) for the resolved business
                    const availableCol = collection(db, 'Products', resolvedBusinessId, 'Available');
                    const unavailableCol = collection(db, 'Products', resolvedBusinessId, 'Unavailable');
                    const [availSnap, unavailSnap] = await Promise.all([getDocs(availableCol), getDocs(unavailableCol)]);

                    // Aggregate ratings. Prefer weighted average by product.reviewCount when available.
                    let weightedSum = 0;
                    let totalProductReviews = 0;
                    let simpleSum = 0;
                    let simpleCount = 0;

                    const allProductDocs = [...availSnap.docs, ...unavailSnap.docs];
                    for (const pd of allProductDocs) {
                        const p = pd.data() || {};
                        if (typeof p.rating === 'number' && !Number.isNaN(p.rating)) {
                            const prCount = Number(p.reviewCount) || 0;
                            if (prCount > 0) {
                                weightedSum += p.rating * prCount;
                                totalProductReviews += prCount;
                            } else {
                                // If no reviewCount, treat as a single review for simple averaging
                                simpleSum += p.rating;
                                simpleCount += 1;
                            }
                        }
                    }

                    let businessAverage = 0;
                    if (totalProductReviews > 0) {
                        // Weighted by review counts
                        businessAverage = weightedSum / totalProductReviews;
                        // If there are products without reviewCount but with rating, include them equally
                        if (simpleCount > 0) {
                            businessAverage = ((businessAverage * totalProductReviews) + simpleSum) / (totalProductReviews + simpleCount);
                        }
                    } else if (simpleCount > 0) {
                        businessAverage = simpleSum / simpleCount;
                        totalProductReviews = simpleCount; // treat as count
                    } else {
                        businessAverage = 0;
                    }

                    const roundedBusinessAvg = Math.round(businessAverage * 10) / 10;

                    // Update the Businesses document with aggregated rating and total review count across products
                    try {
                        const businessRef = doc(db, 'Businesses', resolvedBusinessId);
                        await updateDoc(businessRef, {
                            rating: roundedBusinessAvg,
                            reviewCount: totalProductReviews
                        });
                        console.log(`Updated business (${resolvedBusinessId}) aggregated rating:`, roundedBusinessAvg, 'from', totalProductReviews, 'product reviews');
                    } catch (be) {
                        console.error('Error updating business aggregated rating:', be);
                    }
                } catch (aggErr) {
                    console.error('Error computing business aggregated rating:', aggErr);
                }
            } catch (error) {
                console.error('Error updating product rating:', error);
                throw error;
            }
        } else if (reviewType === 'service') {
            try {
                // First check if businessId is already an email (directly usable as collection key)
                if (businessId.includes('@')) {
                    console.log(`Business ID appears to be an email: ${businessId}, using directly for Services collection`);

                    // Try to update using the email directly
                    const serviceRef = doc(db, 'Services', businessId, 'Active', itemId);

                    // Check if the document exists before updating
                    const serviceDoc = await getDoc(serviceRef);
                    if (serviceDoc.exists()) {
                        console.log(`Service document found at Services/${businessId}/Active/${itemId}`);
                        console.log(`Current service data:`, serviceDoc.data());
                        console.log(`Updating service with rating: ${roundedAverage}, reviewCount: ${reviewCount}`);

                        // Include current rating in update only if it's valid
                        await updateDoc(serviceRef, {
                            rating: roundedAverage,
                            reviewCount
                        });
                        console.log(`Updated service rating successfully using email: ${businessId}`);

                        // Also update the business's overall rating
                        try {
                            const businessRef = doc(db, 'Businesses', businessId);
                            const businessDoc = await getDoc(businessRef);
                            if (businessDoc.exists()) {
                                // Make sure we're working with the current service
                                await ensureServiceRating(businessId, itemId, roundedAverage, reviewCount);

                                // Get all services to calculate overall rating
                                const servicesRef = collection(db, 'Services', businessId, 'Active');
                                const servicesSnap = await getDocs(servicesRef);

                                console.log(`Found ${servicesSnap.size} services for business ${businessId}`);

                                let totalRating = 0;
                                let totalReviews = 0;
                                let includedCurrentService = false;

                                // Debug: log each service and its rating
                                servicesSnap.forEach(doc => {
                                    const serviceData = doc.data();
                                    console.log(`Service ${doc.id}: rating=${serviceData.rating || 'none'}, reviewCount=${serviceData.reviewCount || 0}`);

                                    if (doc.id === itemId) {
                                        includedCurrentService = true;

                                        // For the current service, use the freshly calculated rating
                                        console.log(`Using fresh rating for current service: rating=${roundedAverage}, reviewCount=${reviewCount}`);
                                        if (reviewCount > 0) {
                                            totalRating += roundedAverage * reviewCount;
                                            totalReviews += reviewCount;
                                        }
                                    } else {
                                        // Only include services with valid ratings and review counts
                                        if (typeof serviceData.rating === 'number' && !isNaN(serviceData.rating) &&
                                            typeof serviceData.reviewCount === 'number' && !isNaN(serviceData.reviewCount) &&
                                            serviceData.reviewCount > 0) {
                                            totalRating += serviceData.rating * serviceData.reviewCount;
                                            totalReviews += serviceData.reviewCount;
                                        }
                                    }
                                });

                                // If we didn't include the current service in the calculation and it's a valid service
                                if (!includedCurrentService && itemId && reviewCount > 0) {
                                    console.log(`Adding current service ${itemId} that wasn't in the fetched services`);
                                    totalRating += roundedAverage * reviewCount;
                                    totalReviews += reviewCount;
                                }

                                console.log(`Total weighted rating: ${totalRating}, Total reviews: ${totalReviews}`);

                                // Make sure we have at least one valid review
                                const businessAvgRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;

                                // Also look at the business document to see if it already has a rating
                                const currentBusinessData = businessDoc.data();
                                if (currentBusinessData.rating > 0 &&
                                    typeof currentBusinessData.reviewCount === 'number' &&
                                    currentBusinessData.reviewCount > 0 &&
                                    totalReviews === 0) {
                                    // If we didn't find any service ratings but the business already has a rating, preserve it
                                    console.log(`Preserving existing business rating: ${currentBusinessData.rating} from ${currentBusinessData.reviewCount} reviews`);
                                } else if (totalReviews > 0) {
                                    // Only update if we have valid service ratings
                                    await updateDoc(businessRef, {
                                        rating: businessAvgRating,
                                        reviewCount: totalReviews
                                    });

                                    console.log(`Updated business ${businessId} with overall rating: ${businessAvgRating} from ${totalReviews} reviews`);
                                } else {
                                    console.log(`No reviews found for business ${businessId}, not updating business rating`);
                                }
                            }
                        } catch (businessError) {
                            console.error('Error updating business overall rating:', businessError);
                        }

                        return { averageRating: roundedAverage, reviewCount };
                    } else {
                        console.log(`Service not found at Services/${businessId}/Active/${itemId}, trying alternative paths`);
                    }
                }

                // If not an email or service not found, try to resolve the business document to get the email
                console.log(`Looking up business email for ID: ${businessId}`);
                const businessesRef = collection(db, 'Businesses');
                const q = query(businessesRef, where('businessId', '==', businessId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // Get the first match (should only be one)
                    const businessDoc = querySnapshot.docs[0];
                    const businessData = businessDoc.data();
                    const businessEmail = businessData.email || businessDoc.id;

                    console.log(`Found business email: ${businessEmail} for business ID: ${businessId}`);

                    // Update using the email as the collection key
                    const serviceRef = doc(db, 'Services', businessEmail, 'Active', itemId);

                    // Check if service exists before updating
                    const serviceDoc = await getDoc(serviceRef);
                    if (serviceDoc.exists()) {
                        console.log(`Service found at Services/${businessEmail}/Active/${itemId}`);
                        console.log(`Current service data:`, serviceDoc.data());
                        console.log(`Updating service with rating: ${roundedAverage}, reviewCount: ${reviewCount}`);

                        // Include current rating in update only if it's valid
                        await updateDoc(serviceRef, {
                            rating: roundedAverage,
                            reviewCount
                        });
                        console.log(`Updated service rating successfully using resolved email: ${businessEmail}`);

                        // Also update the business's overall rating
                        try {
                            const businessRef = doc(db, 'Businesses', businessEmail);
                            const businessDoc = await getDoc(businessRef);
                            if (businessDoc.exists()) {
                                // Make sure we're working with the current service
                                await ensureServiceRating(businessEmail, itemId, roundedAverage, reviewCount);

                                // Get all services to calculate overall rating
                                const servicesRef = collection(db, 'Services', businessEmail, 'Active');
                                const servicesSnap = await getDocs(servicesRef);

                                console.log(`Found ${servicesSnap.size} services for business ${businessEmail}`);

                                let totalRating = 0;
                                let totalReviews = 0;
                                let includedCurrentService = false;

                                // Debug: log each service and its rating
                                servicesSnap.forEach(doc => {
                                    const serviceData = doc.data();
                                    console.log(`Service ${doc.id}: rating=${serviceData.rating || 'none'}, reviewCount=${serviceData.reviewCount || 0}`);

                                    if (doc.id === itemId) {
                                        includedCurrentService = true;

                                        // For the current service, use the freshly calculated rating
                                        console.log(`Using fresh rating for current service: rating=${roundedAverage}, reviewCount=${reviewCount}`);
                                        if (reviewCount > 0) {
                                            totalRating += roundedAverage * reviewCount;
                                            totalReviews += reviewCount;
                                        }
                                    } else {
                                        // Only include services with valid ratings and review counts
                                        if (typeof serviceData.rating === 'number' && !isNaN(serviceData.rating) &&
                                            typeof serviceData.reviewCount === 'number' && !isNaN(serviceData.reviewCount) &&
                                            serviceData.reviewCount > 0) {
                                            totalRating += serviceData.rating * serviceData.reviewCount;
                                            totalReviews += serviceData.reviewCount;
                                        }
                                    }
                                });

                                // If we didn't include the current service in the calculation and it's a valid service
                                if (!includedCurrentService && itemId && reviewCount > 0) {
                                    console.log(`Adding current service ${itemId} that wasn't in the fetched services`);
                                    totalRating += roundedAverage * reviewCount;
                                    totalReviews += reviewCount;
                                }

                                console.log(`Total weighted rating: ${totalRating}, Total reviews: ${totalReviews}`);

                                // Make sure we have at least one valid review
                                const businessAvgRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;

                                // Also look at the business document to see if it already has a rating
                                const currentBusinessData = businessDoc.data();
                                if (currentBusinessData.rating > 0 &&
                                    typeof currentBusinessData.reviewCount === 'number' &&
                                    currentBusinessData.reviewCount > 0 &&
                                    totalReviews === 0) {
                                    // If we didn't find any service ratings but the business already has a rating, preserve it
                                    console.log(`Preserving existing business rating: ${currentBusinessData.rating} from ${currentBusinessData.reviewCount} reviews`);
                                } else if (totalReviews > 0) {
                                    // Only update if we have valid service ratings
                                    await updateDoc(businessRef, {
                                        rating: businessAvgRating,
                                        reviewCount: totalReviews
                                    });

                                    console.log(`Updated business ${businessEmail} with overall rating: ${businessAvgRating} from ${totalReviews} reviews`);
                                } else {
                                    console.log(`No reviews found for business ${businessEmail}, not updating business rating`);
                                }
                            }
                        } catch (businessError) {
                            console.error('Error updating business overall rating:', businessError);
                        }

                        return { averageRating: roundedAverage, reviewCount };
                    } else {
                        console.log(`Service not found at Services/${businessEmail}/Active/${itemId}, trying alternative paths`);
                    }
                }

                // Last attempt: try with lowercase services collection
                console.log(`Trying lowercase 'services' collection with ID: ${itemId}`);
                const serviceRef = doc(db, 'services', itemId);
                const serviceDoc = await getDoc(serviceRef);
                if (serviceDoc.exists()) {
                    console.log(`Service document exists at services/${itemId}, updating rating`);
                    const serviceData = serviceDoc.data();
                    console.log(`Current service data:`, serviceData);

                    // Update the service with the new rating
                    await updateDoc(serviceRef, {
                        rating: roundedAverage,
                        reviewCount
                    });

                    // If the service has a businessId field, try to update that business's overall rating too
                    if (serviceData.businessId) {
                        try {
                            // First get the business email from the businessId
                            const businessEmail = await resolveBusinessDocumentId(serviceData.businessId);
                            if (businessEmail) {
                                const businessRef = doc(db, 'Businesses', businessEmail);
                                const businessDoc = await getDoc(businessRef);

                                if (businessDoc.exists()) {
                                    // Get all services for this business to calculate overall rating
                                    const servicesQuery = query(
                                        collection(db, 'services'),
                                        where('businessId', '==', serviceData.businessId)
                                    );
                                    const servicesSnap = await getDocs(servicesQuery);

                                    console.log(`Found ${servicesSnap.size} services in lowercase collection for business ${serviceData.businessId}`);

                                    let totalRating = 0;
                                    let totalReviews = 0;

                                    servicesSnap.forEach(doc => {
                                        const svcData = doc.data();
                                        if (typeof svcData.rating === 'number' && !isNaN(svcData.rating) &&
                                            typeof svcData.reviewCount === 'number' && !isNaN(svcData.reviewCount) &&
                                            svcData.reviewCount > 0) {
                                            totalRating += svcData.rating * svcData.reviewCount;
                                            totalReviews += svcData.reviewCount;
                                        }
                                    });

                                    // Update the business rating
                                    const businessAvgRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;
                                    await updateDoc(businessRef, {
                                        rating: businessAvgRating,
                                        reviewCount: totalReviews
                                    });

                                    console.log(`Updated business ${businessEmail} with overall rating: ${businessAvgRating} from ${totalReviews} reviews in lowercase services collection`);
                                }
                            }
                        } catch (businessError) {
                            console.error('Error updating business rating from lowercase services collection:', businessError);
                        }
                    }

                    return { averageRating: roundedAverage, reviewCount };
                }

                console.error(`Service document not found for itemId: ${itemId} under any collection path`);
                throw new Error(`Service with ID ${itemId} not found for business ${businessId}`);
            } catch (error) {
                console.error('Error updating service rating:', error);
                throw error;
            }
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
                reviewPath = `Reviews/Products/${reviewRef.businessId}_${reviewRef.itemId}/${reviewRef.reviewId}`;
            } else if (reviewRef.type === 'service') {
                reviewPath = `Reviews/Services/${reviewRef.businessId}_${reviewRef.itemId}/${reviewRef.reviewId}`;
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
 * @param {string} businessId - ID of the business (usually the email)
 * @param {string} itemId - ID of the product or service (if applicable)
 * @returns {Promise<object>} Review statistics
 */
export const getReviewStats = async (reviewType, businessId, itemId = null) => {
    try {
        console.log(`📊 Getting review stats for ${reviewType} ${businessId}${itemId ? ', itemId: ' + itemId : ''}`);

        // Input validation
        if (!businessId) {
            console.error('❌ Missing businessId in getReviewStats');
            return { averageRating: 0, reviewCount: 0, ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, ratingPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        }

        // Define possible collection paths to check for reviews
        const collectionPaths = [];

        if (reviewType === 'business') {
            // Standard path
            collectionPaths.push(`Reviews/Businesses/${businessId}`);

            // Alternative paths based on different naming conventions
            collectionPaths.push(`BusinessReviews/${businessId}/Reviews`);

            // Check both singular and plural forms
            collectionPaths.push(`Review/Businesses/${businessId}`);
            collectionPaths.push(`Review/Business/${businessId}`);
            collectionPaths.push(`Reviews/Business/${businessId}`);
        } else if (reviewType === 'product' && itemId) {
            // Standard path
            collectionPaths.push(`Reviews/Products/${businessId}_${itemId}`);

            // Alternative paths
            collectionPaths.push(`Reviews/Product/${businessId}_${itemId}`);
            collectionPaths.push(`ProductReviews/${businessId}/${itemId}`);
        } else if (reviewType === 'service' && itemId) {
            // Standard path with direct business ID
            collectionPaths.push(`Reviews/Services/${businessId}_${itemId}`);

            // Alternative paths
            collectionPaths.push(`Reviews/Service/${businessId}_${itemId}`);
            collectionPaths.push(`ServiceReviews/${businessId}/${itemId}`);

            // Resolve business ID if it's not an email
            if (!businessId.includes('@')) {
                try {
                    const resolvedBusinessId = await resolveBusinessDocumentId(businessId);
                    if (resolvedBusinessId && resolvedBusinessId !== businessId) {
                        collectionPaths.push(`Reviews/Services/${resolvedBusinessId}_${itemId}`);
                        collectionPaths.push(`Reviews/Service/${resolvedBusinessId}_${itemId}`);
                        collectionPaths.push(`ServiceReviews/${resolvedBusinessId}/${itemId}`);
                    }
                } catch (e) {
                    console.error('Error resolving business ID:', e);
                }
            }
        }

        console.log(`Checking collection paths:`, collectionPaths);

        // Collect review data from all possible collection paths
        let allReviews = [];

        // Try each collection path
        for (const path of collectionPaths) {
            try {
                const reviewsQuery = query(collection(db, path));
                const reviewsSnapshot = await getDocs(reviewsQuery);

                if (!reviewsSnapshot.empty) {
                    console.log(`Found ${reviewsSnapshot.size} reviews in ${path}`);

                    reviewsSnapshot.forEach(doc => {
                        const reviewData = doc.data();
                        if (reviewData && typeof reviewData.rating === 'number') {
                            allReviews.push(reviewData);
                        }
                    });

                    // If we found reviews, we can break early (optional)
                    if (allReviews.length > 0) {
                        console.log(`Using ${allReviews.length} reviews from ${path}`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`Error querying ${path}:`, error.message);
                // Continue to the next path
            }
        }

        // If no reviews found in canonical paths, check alternate collections
        if (allReviews.length === 0) {
            console.log(`⚠️ No reviews found in standard paths, checking alternate collections`);
            const alternateResults = await queryAlternateRatingCollections(reviewType, businessId, itemId, 100); // Get more reviews for accurate stats

            if (alternateResults.reviews && alternateResults.reviews.length > 0) {
                console.log(`✅ Found ${alternateResults.reviews.length} reviews in alternate collection`);
                allReviews = alternateResults.reviews;
            }
        }

        // If we still don't have reviews, check if the business has rating data
        if (allReviews.length === 0) {
            try {
                // Check the Businesses collection
                const businessDoc = await getDoc(doc(db, 'Businesses', businessId));
                if (businessDoc.exists()) {
                    const businessData = businessDoc.data();

                    if (typeof businessData.rating === 'number' && businessData.rating > 0 &&
                        typeof businessData.reviewCount === 'number' && businessData.reviewCount > 0) {
                        console.log(`Using rating data from Businesses/${businessId}: rating=${businessData.rating}, reviewCount=${businessData.reviewCount}`);

                        // Create a single synthetic review with the business rating
                        const syntheticReview = {
                            rating: businessData.rating,
                            reviewCount: businessData.reviewCount
                        };

                        // Generate synthetic reviews based on the rating
                        const reviewCount = businessData.reviewCount;
                        const roundedRating = Math.round(businessData.rating);

                        // Create a default rating counts object
                        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

                        // Distribute reviews around the rounded rating
                        if (roundedRating >= 1 && roundedRating <= 5) {
                            // Put most reviews at the main rating
                            ratingCounts[roundedRating] = Math.floor(reviewCount * 0.7);

                            // Distribute the rest to adjacent ratings if possible
                            let remaining = reviewCount - ratingCounts[roundedRating];

                            if (roundedRating > 1) {
                                ratingCounts[roundedRating - 1] = Math.floor(remaining * 0.6);
                                remaining -= ratingCounts[roundedRating - 1];
                            }

                            if (roundedRating < 5) {
                                ratingCounts[roundedRating + 1] = Math.floor(remaining * 0.8);
                                remaining -= ratingCounts[roundedRating + 1];
                            }

                            // Distribute any remaining reviews to other buckets
                            for (let i = 1; i <= 5; i++) {
                                if (i !== roundedRating && i !== roundedRating - 1 && i !== roundedRating + 1 && remaining > 0) {
                                    ratingCounts[i] = Math.ceil(remaining / (5 - 3)); // Divide remaining among other buckets
                                    remaining -= ratingCounts[i];
                                }
                            }

                            // Add any remaining to the main rating
                            if (remaining > 0) {
                                ratingCounts[roundedRating] += remaining;
                            }
                        }

                        // Calculate rating percentages
                        const ratingPercentages = {};
                        for (let i = 1; i <= 5; i++) {
                            ratingPercentages[i] = reviewCount > 0 ? (ratingCounts[i] / reviewCount) * 100 : 0;
                        }

                        return {
                            averageRating: businessData.rating,
                            reviewCount: businessData.reviewCount,
                            ratingCounts: ratingCounts,
                            ratingPercentages: ratingPercentages
                        };
                    }
                }

                // If business doesn't have rating data, check products and services
                if (reviewType === 'business') {
                    // Get products for this business
                    try {
                        const availCol = collection(db, 'Products', businessId, 'Available');
                        const unavailCol = collection(db, 'Products', businessId, 'Unavailable');
                        const [availSnap, unavailSnap] = await Promise.all([
                            getDocs(availCol).catch(() => ({ docs: [] })),
                            getDocs(unavailCol).catch(() => ({ docs: [] }))
                        ]);

                        const allProducts = [...availSnap.docs, ...unavailSnap.docs].map(d => ({ id: d.id, ...d.data() }));
                        console.log(`Found ${allProducts.length} products for business:`, businessId);

                        let totalRating = 0;
                        let totalReviews = 0;

                        allProducts.forEach(product => {
                            if (typeof product.rating === 'number' && product.rating > 0 &&
                                typeof product.reviewCount === 'number' && product.reviewCount > 0) {
                                totalRating += product.rating * product.reviewCount;
                                totalReviews += product.reviewCount;
                            }
                        });

                        if (totalReviews > 0) {
                            const avgRating = totalRating / totalReviews;
                            console.log(`Calculated average rating from products: ${avgRating} from ${totalReviews} reviews`);

                            // Create synthetic reviews from product data
                            for (const product of allProducts) {
                                if (typeof product.rating === 'number' && product.rating > 0 &&
                                    typeof product.reviewCount === 'number' && product.reviewCount > 0) {
                                    for (let i = 0; i < product.reviewCount; i++) {
                                        allReviews.push({ rating: product.rating });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error fetching products for rating calculation:', e);
                    }

                    // Get services for this business
                    try {
                        const servicesCol = collection(db, 'Services', businessId, 'Active');
                        const servicesSnap = await getDocs(servicesCol).catch(() => ({ docs: [] }));

                        const allServices = [...servicesSnap.docs].map(d => ({ id: d.id, ...d.data() }));
                        console.log(`Found ${allServices.length} services for business:`, businessId);

                        let totalRating = 0;
                        let totalReviews = 0;

                        allServices.forEach(service => {
                            if (typeof service.rating === 'number' && service.rating > 0 &&
                                typeof service.reviewCount === 'number' && service.reviewCount > 0) {
                                totalRating += service.rating * service.reviewCount;
                                totalReviews += service.reviewCount;
                            }
                        });

                        if (totalReviews > 0) {
                            const avgRating = totalRating / totalReviews;
                            console.log(`Calculated average rating from services: ${avgRating} from ${totalReviews} reviews`);

                            // Create synthetic reviews from service data
                            for (const service of allServices) {
                                if (typeof service.rating === 'number' && service.rating > 0 &&
                                    typeof service.reviewCount === 'number' && service.reviewCount > 0) {
                                    for (let i = 0; i < service.reviewCount; i++) {
                                        allReviews.push({ rating: service.rating });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error fetching services for rating calculation:', e);
                    }
                }
            } catch (e) {
                console.error('Error checking business document for rating data:', e);
            }
        }

        // Calculate statistics from all collected reviews
        console.log(`📝 Processing ${allReviews.length} reviews for stats calculation`);

        let totalRating = 0;
        let reviewCount = 0;
        const ratingCounts = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };

        allReviews.forEach(review => {
            if (review && typeof review.rating === 'number') {
                totalRating += review.rating;
                reviewCount++;

                // Count reviews by rating - use Math.round for proper bucket assignment
                const ratingBucket = Math.min(Math.max(Math.round(review.rating), 1), 5);
                ratingCounts[ratingBucket]++;
            }
        });

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal place

        // Calculate rating percentages
        const ratingPercentages = {};
        for (let i = 1; i <= 5; i++) {
            ratingPercentages[i] = reviewCount > 0 ? (ratingCounts[i] / reviewCount) * 100 : 0;
        }

        const result = {
            averageRating: roundedAverage,
            reviewCount,
            ratingCounts,
            ratingPercentages
        };

        console.log(`📊 Review stats calculated:`, result);
        return result;
    } catch (error) {
        console.error('❌ Error getting review stats:', error, {
            reviewType,
            businessId,
            itemId
        });
        // Return default empty stats on error
        return {
            averageRating: 0,
            reviewCount: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            ratingPercentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
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

        // If there are no reviews under the Reviews path, try alternate Rating/Ratings collections
        if (businessReviewsSnapshot.empty) {
            const alt = await queryAlternateRatingCollections('business', businessId, null, limit);
            if (alt.reviews && alt.reviews.length > 0) {
                // Normalize alternate reviews into recentReviews shape
                for (const r of alt.reviews) {
                    const createdAt = r.createdAt ? (r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt)) : new Date();
                    const updatedAt = r.updatedAt ? (r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt)) : new Date();
                    recentReviews.push({
                        id: r.id,
                        ...r,
                        type: 'business',
                        businessId,
                        createdAt,
                        updatedAt,
                        businessResponse: r.businessResponse || null
                    });
                }
                return recentReviews;
            }
        }

        businessReviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();

            // Convert Firestore Timestamps to JS Dates
            const createdAt = reviewData.createdAt ? (reviewData.createdAt.toDate ? reviewData.createdAt.toDate() : new Date(reviewData.createdAt)) : new Date();
            const updatedAt = reviewData.updatedAt ? (reviewData.updatedAt.toDate ? reviewData.updatedAt.toDate() : new Date(reviewData.updatedAt)) : new Date();

            const businessResponse = reviewData.businessResponse ? {
                ...reviewData.businessResponse,
                createdAt: reviewData.businessResponse.createdAt ? (reviewData.businessResponse.createdAt.toDate ? reviewData.businessResponse.createdAt.toDate() : new Date(reviewData.businessResponse.createdAt)) : null
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
