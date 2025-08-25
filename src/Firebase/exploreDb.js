// src/Firebase/exploreDb.js
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "./config";

/**
 * Get all businesses from Businesses collection
 * @param {string} category - Filter by business category (optional)
 * @param {number} limitCount - Number of businesses to fetch
 * @returns {Array} Array of business objects
 */
export const getAllBusinesses = async (category = null, limitCount = 20) => {
    try {
        console.log("🔍 Fetching businesses from Firebase...");

        let businessQuery;

        // For now, just get all businesses without orderBy to avoid index issues
        businessQuery = query(
            collection(db, "Businesses"),
            limit(limitCount)
        );

        const snapshot = await getDocs(businessQuery);

        console.log(`📊 Found ${snapshot.docs.length} business documents in Firebase`);

        const businesses = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`📋 Processing business: ${doc.id}`, {
                businessName: data.businessName,
                businessType: data.businessType,
                hasLogo: !!data.logo
            });

            return {
                id: doc.id,
                ...data,
                email: data.email || doc.id, // Add email field (Firebase doc ID is the email)
                businessId: data.businessId || doc.id,
                businessName: data.businessName || 'Unknown Business',
                businessType: data.businessType || 'General',
                description: data.description || data.businessDescription || 'No description available',
                address: {
                    city: data.cityName || data.city || 'Unknown City',
                    state: data.stateName || data.state || 'Unknown State'
                },
                rating: data.rating || 4.0,
                reviewCount: data.reviewCount || 0,
                logo: data.logo?.url || data.logo || null,
                isVerified: data.isVerified || false
            };
        });

        console.log(`✅ Successfully processed ${businesses.length} businesses`);

        // Add detailed logging
        if (businesses.length > 0) {
            console.log('📝 Sample business data:', businesses[0]);
        } else {
            console.log("⚠️ No businesses found in Firebase");
        }

        return businesses;
    } catch (error) {
        console.error("❌ Error fetching businesses:", error);
        return [];
    }
};

/**
 * Get all products from all businesses
 * @param {string} category - Filter by product category (optional)
 * @param {number} limitCount - Number of products to fetch per business
 * @returns {Array} Array of product objects
 */
export const getAllProducts = async (category = null, limitCount = 50) => {
    try {
        // First get all businesses
        const businessQuery = query(
            collection(db, "Businesses")
        );

        const businessSnapshot = await getDocs(businessQuery);
        const businesses = businessSnapshot.docs;

        const allProducts = [];

        // For each business, get products from Available subcollection
        for (const businessDoc of businesses) {
            const businessEmail = businessDoc.id;
            const businessData = businessDoc.data();

            try {
                // Get products from Available subcollection (for in-stock products)
                const availableProductsRef = collection(db, "Products", businessEmail, "Available");
                let availableProductQuery;

                if (category && category !== 'all') {
                    availableProductQuery = query(availableProductsRef, where("category", "==", category));
                } else {
                    availableProductQuery = query(availableProductsRef);
                }

                const availableProductSnapshot = await getDocs(availableProductQuery);
                const availableProducts = availableProductSnapshot.docs.map(doc => ({
                    id: doc.id,
                    productId: doc.id,
                    ...doc.data(),
                    businessName: businessData.businessName || 'Unknown Business',
                    businessEmail: businessEmail,
                    businessId: businessData.businessId || businessEmail,
                    businessState: businessData.state || businessData.businessState,
                    businessCity: businessData.city || businessData.businessCity,
                    businessStateName: businessData.stateName || businessData.businessStateName,
                    businessCityName: businessData.cityName || businessData.businessCityName,
                    images: doc.data().images || [],
                    rating: doc.data().rating || 4.0,
                    reviewCount: doc.data().reviewCount || 0,
                    category: doc.data().category || 'General',
                    inStock: true // Since it's from Available subcollection
                }));

                allProducts.push(...availableProducts);

                // Also get products from Unavailable subcollection (for out-of-stock products)
                const unavailableProductsRef = collection(db, "Products", businessEmail, "Unavailable");
                let unavailableProductQuery;

                if (category && category !== 'all') {
                    unavailableProductQuery = query(unavailableProductsRef, where("category", "==", category));
                } else {
                    unavailableProductQuery = query(unavailableProductsRef);
                }

                const unavailableProductSnapshot = await getDocs(unavailableProductQuery);
                const unavailableProducts = unavailableProductSnapshot.docs.map(doc => ({
                    id: doc.id,
                    productId: doc.id,
                    ...doc.data(),
                    businessName: businessData.businessName || 'Unknown Business',
                    businessEmail: businessEmail,
                    businessId: businessData.businessId || businessEmail,
                    businessState: businessData.state || businessData.businessState,
                    businessCity: businessData.city || businessData.businessCity,
                    businessStateName: businessData.stateName || businessData.businessStateName,
                    businessCityName: businessData.cityName || businessData.businessCityName,
                    images: doc.data().images || [],
                    rating: doc.data().rating || 4.0,
                    reviewCount: doc.data().reviewCount || 0,
                    category: doc.data().category || 'General',
                    inStock: false // Since it's from Unavailable subcollection
                }));

                allProducts.push(...unavailableProducts);
            } catch (productError) {
                console.error(`Error fetching products for business ${businessEmail}:`, productError);
            }

            // Stop if we've reached the limit
            if (allProducts.length >= limitCount) {
                break;
            }
        }

        // Sort by creation date (newest first) and limit
        const sortedProducts = allProducts
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            })
            .slice(0, limitCount);

        console.log(`Fetched ${sortedProducts.length} products from Firebase`);

        // Add detailed logging
        if (sortedProducts.length > 0) {
            console.log('Sample product data:', sortedProducts[0]);
        }

        return sortedProducts;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

/**
 * Get all services from all businesses
 * @param {string} category - Filter by service category (optional)
 * @param {number} limitCount - Number of services to fetch
 * @returns {Array} Array of service objects
 */
export const getAllServices = async (category = null, limitCount = 50) => {
    try {
        // First get all businesses
        const businessQuery = query(
            collection(db, "Businesses"),
        );

        const businessSnapshot = await getDocs(businessQuery);
        const businesses = businessSnapshot.docs;

        const allServices = [];

        // For each business, get services from Active subcollection
        for (const businessDoc of businesses) {
            const businessEmail = businessDoc.id;
            const businessData = businessDoc.data();

            try {
                // Get services from Active subcollection
                const servicesRef = collection(db, "Services", businessEmail, "Active");
                let serviceQuery;

                if (category && category !== 'all') {
                    serviceQuery = query(servicesRef, where("category", "==", category));
                } else {
                    serviceQuery = query(servicesRef);
                }

                const serviceSnapshot = await getDocs(serviceQuery);
                const businessServices = serviceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    serviceId: doc.id,
                    ...doc.data(),
                    businessName: businessData.businessName || 'Unknown Business',
                    businessEmail: businessEmail,
                    businessId: businessData.businessId || businessEmail,
                    businessState: businessData.state || businessData.businessState,
                    businessCity: businessData.city || businessData.businessCity,
                    businessStateName: businessData.stateName || businessData.businessStateName,
                    businessCityName: businessData.cityName || businessData.businessCityName,
                    images: doc.data().images || [],
                    rating: doc.data().rating || 4.0,
                    reviewCount: doc.data().reviewCount || 0,
                    category: doc.data().category || 'General',
                    isActive: true // Since it's from Active subcollection
                }));

                allServices.push(...businessServices);

                // Also get services from Inactive subcollection
                const inactiveServicesRef = collection(db, "Services", businessEmail, "Inactive");
                let inactiveServiceQuery;

                if (category && category !== 'all') {
                    inactiveServiceQuery = query(inactiveServicesRef, where("category", "==", category));
                } else {
                    inactiveServiceQuery = query(inactiveServicesRef);
                }

                const inactiveServiceSnapshot = await getDocs(inactiveServiceQuery);
                const inactiveServices = inactiveServiceSnapshot.docs.map(doc => ({
                    id: doc.id,
                    serviceId: doc.id,
                    ...doc.data(),
                    businessName: businessData.businessName || 'Unknown Business',
                    businessEmail: businessEmail,
                    businessId: businessData.businessId || businessEmail,
                    businessState: businessData.state || businessData.businessState,
                    businessCity: businessData.city || businessData.businessCity,
                    businessStateName: businessData.stateName || businessData.businessStateName,
                    businessCityName: businessData.cityName || businessData.businessCityName,
                    images: doc.data().images || [],
                    rating: doc.data().rating || 4.0,
                    reviewCount: doc.data().reviewCount || 0,
                    category: doc.data().category || 'General',
                    isActive: false // Since it's from Inactive subcollection
                }));

                allServices.push(...inactiveServices);
            } catch (serviceError) {
                console.error(`Error fetching services for business ${businessEmail}:`, serviceError);
            }

            // Stop if we've reached the limit
            if (allServices.length >= limitCount) {
                break;
            }
        }

        // Sort by creation date (newest first) and limit
        const sortedServices = allServices
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            })
            .slice(0, limitCount);

        console.log(`Fetched ${sortedServices.length} services from Firebase`);

        // Add detailed logging
        if (sortedServices.length > 0) {
            console.log('Sample service data:', sortedServices[0]);
        }

        return sortedServices;
    } catch (error) {
        console.error("Error fetching services:", error);
        return [];
    }
};

/**
 * Search businesses, products, and services by search term
 * @param {string} searchTerm - The search term
 * @param {string} category - Filter by category (optional)
 * @returns {Object} Object containing businesses, products, and services arrays
 */
export const searchAll = async (searchTerm, category = null) => {
    try {
        const [businesses, products, services] = await Promise.all([
            getAllBusinesses(category, 10),
            getAllProducts(category, 20),
            getAllServices(category, 20)
        ]);

        // Filter by search term if provided
        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();

            const filteredBusinesses = businesses.filter(business =>
                business.businessName?.toLowerCase().includes(term) ||
                business.description?.toLowerCase().includes(term) ||
                business.businessType?.toLowerCase().includes(term)
            );

            const filteredProducts = products.filter(product =>
                product.name?.toLowerCase().includes(term) ||
                product.description?.toLowerCase().includes(term) ||
                product.category?.toLowerCase().includes(term) ||
                product.businessName?.toLowerCase().includes(term)
            );

            const filteredServices = services.filter(service =>
                service.name?.toLowerCase().includes(term) ||
                service.description?.toLowerCase().includes(term) ||
                service.category?.toLowerCase().includes(term) ||
                service.businessName?.toLowerCase().includes(term)
            );

            return {
                businesses: filteredBusinesses,
                products: filteredProducts,
                services: filteredServices
            };
        }

        return {
            businesses,
            products,
            services
        };
    } catch (error) {
        console.error("Error searching:", error);
        return {
            businesses: [],
            products: [],
            services: []
        };
    }
};

/**
 * Get business details by business ID or email
 * @param {string} businessId - Business ID or email
 * @returns {Object|null} Business data or null if not found
 */
export const getBusinessById = async (businessId) => {
    try {
        const businessRef = doc(db, "Businesses", businessId);
        const businessDoc = await getDoc(businessRef);

        if (businessDoc.exists()) {
            return {
                id: businessDoc.id,
                ...businessDoc.data()
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching business:", error);
        return null;
    }
};
