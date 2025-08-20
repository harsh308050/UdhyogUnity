// dashboardStats.js
/**
 * This file contains functions to fetch dashboard statistics for a business.
 * 
 * IMPORTANT: The functions in this file have been enhanced to check multiple 
 * possible collection paths for services, products and reviews, since the data
 * might be stored in different locations depending on how they were created.
 * 
 * Key changes:
 * 1. Services are checked in:
 *    - lowercase 'services' collection with businessId field
 *    - 'Services/{businessId}/Active' subcollection
 *    - 'Services/{businessId}/ActiveServices' subcollection
 * 
 * 2. Products are checked in:
 *    - lowercase 'products' collection with businessId field
 *    - 'Products/{businessId}/Available' subcollection
 *    - 'Products/{businessId}/Unavailable' subcollection
 * 
 * 3. Ratings are calculated from:
 *    - 'reviews' collection
 *    - business document itself
 *    - service documents (with proper weighting based on reviewCount)
 *    - product documents (with proper weighting based on reviewCount)
 */
import { db } from "./config";
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from "firebase/firestore";

/**
 * Fetch all dashboard statistics for a business
 * @param {string} businessId - The business ID or email to fetch stats for
 * @returns {Object} Object containing all dashboard statistics
 */
export const fetchDashboardStats = async (businessId) => {
  try {
    if (!businessId) {
      console.error("Business ID is required to fetch dashboard statistics");
      return {
        serviceCount: 0,
        productCount: 0,
        pendingReservations: 0,
        paymentsReceived: 0,
        averageRating: 0,
        totalReviews: 0
      };
    }

    console.log(`Fetching dashboard stats for: ${businessId}`);

    // Special case: If this looks like an email, try to directly fetch the business document
    // to get pre-calculated rating and review count
    if (businessId.includes('@')) {
      try {
        const businessDoc = await getDoc(doc(db, "Businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          console.log("Found business document directly by email:", businessData);

          if (businessData.rating !== undefined && businessData.reviewCount !== undefined) {
            console.log(`Found rating in business document: ${businessData.rating}, reviews: ${businessData.reviewCount}`);
          }
        }
      } catch (error) {
        console.error("Error getting business document by email:", error);
      }
    }

    const stats = {};

    // Fetch services count
    const servicesCount = await getServicesCount(businessId);
    stats.serviceCount = servicesCount;

    // Fetch products count
    const productsCount = await getProductsCount(businessId);
    stats.productCount = productsCount;

    // Fetch pending reservations
    const pendingReservations = await getPendingReservationsCount(businessId);
    stats.pendingReservations = pendingReservations;

    // Fetch payments received
    const payments = await getPaymentsReceived(businessId);
    stats.paymentsReceived = payments;

    // Fetch rating stats
    const ratingStats = await getRatingStats(businessId);
    stats.averageRating = ratingStats.average;
    stats.totalReviews = ratingStats.total;

    console.log("Dashboard stats fetched successfully:", stats);
    return stats;
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    return {
      serviceCount: 0,
      productCount: 0,
      pendingReservations: 0,
      paymentsReceived: 0,
      averageRating: 0,
      totalReviews: 0
    };
  }
};

/**
 * Get the total number of services offered by a business
 * @param {string} businessId - Business ID
 * @returns {number} Count of services
 */
export const getServicesCount = async (businessId) => {
  try {
    console.log(`Fetching services count for business ID: ${businessId}`);
    let totalCount = 0;

    // Try to get the email from the businessId if it's not an email
    let email = businessId;
    if (!businessId.includes('@')) {
      // Try to get the business document to extract the email
      try {
        const businessDoc = await getDoc(doc(db, "Businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          if (businessData.email) {
            email = businessData.email;
            console.log(`Found email ${email} for businessId ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting email from business document:", error);
      }
    } else {
      console.log(`Using email directly: ${email}`);
    }

    // Check lowercase "services" collection first
    try {
      const servicesQuery = query(
        collection(db, "services"),
        where("businessId", "==", businessId)
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      console.log(`Found ${servicesSnapshot.size} services in 'services' collection`);
      totalCount += servicesSnapshot.size;
    } catch (error) {
      console.error("Error checking 'services' collection:", error);
    }

    // Check lowercase "services" collection with email field
    try {
      const servicesEmailQuery = query(
        collection(db, "services"),
        where("email", "==", email)
      );
      const servicesEmailSnapshot = await getDocs(servicesEmailQuery);
      console.log(`Found ${servicesEmailSnapshot.size} services in 'services' collection by email`);
      totalCount += servicesEmailSnapshot.size;
    } catch (error) {
      console.error("Error checking 'services' collection by email:", error);
    }

    // Check "Services" with uppercase S and "Active" subcollection - try both businessId and email
    try {
      // Try with businessId
      const activeServicesRef = collection(db, "Services", businessId, "Active");
      const activeServicesSnapshot = await getDocs(activeServicesRef);
      console.log(`Found ${activeServicesSnapshot.size} services in 'Services/${businessId}/Active' collection`);
      totalCount += activeServicesSnapshot.size;
    } catch (error) {
      console.log(`No services found in 'Services/${businessId}/Active' collection, trying with email`);

      try {
        // Try with email
        const activeServicesEmailRef = collection(db, "Services", email, "Active");
        const activeServicesEmailSnapshot = await getDocs(activeServicesEmailRef);
        console.log(`Found ${activeServicesEmailSnapshot.size} services in 'Services/${email}/Active' collection`);
        totalCount += activeServicesEmailSnapshot.size;
      } catch (emailError) {
        console.error(`Error checking 'Services/${email}/Active' collection:`, emailError);
      }
    }

    // Check "Services" with uppercase S and "ActiveServices" subcollection - try both businessId and email
    try {
      // Try with businessId
      const activeServicesRef = collection(db, "Services", businessId, "ActiveServices");
      const activeServicesSnapshot = await getDocs(activeServicesRef);
      console.log(`Found ${activeServicesSnapshot.size} services in 'Services/${businessId}/ActiveServices' collection`);
      totalCount += activeServicesSnapshot.size;
    } catch (error) {
      console.log(`No services found in 'Services/${businessId}/ActiveServices' collection, trying with email`);

      try {
        // Try with email
        const activeServicesEmailRef = collection(db, "Services", email, "ActiveServices");
        const activeServicesEmailSnapshot = await getDocs(activeServicesEmailRef);
        console.log(`Found ${activeServicesEmailSnapshot.size} services in 'Services/${email}/ActiveServices' collection`);
        totalCount += activeServicesEmailSnapshot.size;
      } catch (emailError) {
        console.error(`Error checking 'Services/${email}/ActiveServices' collection:`, emailError);
      }
    }

    console.log(`Total services count: ${totalCount}`);
    return totalCount;
  } catch (error) {
    console.error("Error getting services count:", error);
    return 0;
  }
};

/**
 * Get the total number of products offered by a business
 * @param {string} businessId - Business ID or email
 * @returns {number} Count of products
 */
export const getProductsCount = async (businessId) => {
  try {
    console.log(`Fetching products count for business ID: ${businessId}`);
    let totalCount = 0;

    // Try to get the email from the businessId if it's not an email
    let email = businessId;
    let actualBusinessId = businessId;

    if (!businessId.includes('@')) {
      // Try to get the business document to extract the email
      try {
        const businessDoc = await getDoc(doc(db, "Businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          if (businessData.email) {
            email = businessData.email;
            console.log(`Found email ${email} for businessId ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting email from business document:", error);
      }
    } else {
      // If businessId is an email, try to get the actual business ID
      try {
        const businessQuery = query(
          collection(db, "Businesses"),
          where("email", "==", businessId)
        );
        const businessSnapshot = await getDocs(businessQuery);
        if (!businessSnapshot.empty) {
          const businessData = businessSnapshot.docs[0].data();
          if (businessData.businessId) {
            actualBusinessId = businessData.businessId;
            console.log(`Found actual businessId ${actualBusinessId} for email ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting actual businessId from email:", error);
      }
    }

    // Check lowercase "products" collection with businessId
    try {
      const productsQuery = query(
        collection(db, "Products"),
        where("businessId", "==", actualBusinessId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      console.log(`Found ${productsSnapshot.size} products in 'Products' collection with businessId ${actualBusinessId}`);
      totalCount += productsSnapshot.size;
    } catch (error) {
      console.error("Error checking 'Products' collection:", error);
    }

    // If email is different from businessId, also check with email
    if (email !== actualBusinessId) {
      try {
        const productsEmailQuery = query(
          collection(db, "products"),
          where("businessEmail", "==", email)
        );
        const productsEmailSnapshot = await getDocs(productsEmailQuery);
        console.log(`Found ${productsEmailSnapshot.size} products in 'products' collection with email ${email}`);
        totalCount += productsEmailSnapshot.size;
      } catch (error) {
        console.error(`Error checking 'products' collection with email ${email}:`, error);
      }
    }

    // Try Products collection with both businessId and email
    // First try with actualBusinessId
    try {
      const availableProductsRef = collection(db, "Products", actualBusinessId, "Available");
      const availableProductsSnapshot = await getDocs(availableProductsRef);
      console.log(`Found ${availableProductsSnapshot.size} products in 'Products/${actualBusinessId}/Available' collection`);
      totalCount += availableProductsSnapshot.size;
    } catch (error) {
      console.log(`No products in 'Products/${actualBusinessId}/Available' collection, trying with email`);

      // Try with email if different
      if (email !== actualBusinessId) {
        try {
          const availableProductsEmailRef = collection(db, "Products", email, "Available");
          const availableProductsEmailSnapshot = await getDocs(availableProductsEmailRef);
          console.log(`Found ${availableProductsEmailSnapshot.size} products in 'Products/${email}/Available' collection`);
          totalCount += availableProductsEmailSnapshot.size;
        } catch (emailError) {
          console.error(`Error checking 'Products/${email}/Available' collection:`, emailError);
        }
      }
    }

    // Try Unavailable products with both businessId and email
    // First try with actualBusinessId
    try {
      const unavailableProductsRef = collection(db, "Products", actualBusinessId, "Unavailable");
      const unavailableProductsSnapshot = await getDocs(unavailableProductsRef);
      console.log(`Found ${unavailableProductsSnapshot.size} products in 'Products/${actualBusinessId}/Unavailable' collection`);
      totalCount += unavailableProductsSnapshot.size;
    } catch (error) {
      console.log(`No products in 'Products/${actualBusinessId}/Unavailable' collection, trying with email`);

      // Try with email if different
      if (email !== actualBusinessId) {
        try {
          const unavailableProductsEmailRef = collection(db, "Products", email, "Unavailable");
          const unavailableProductsEmailSnapshot = await getDocs(unavailableProductsEmailRef);
          console.log(`Found ${unavailableProductsEmailSnapshot.size} products in 'Products/${email}/Unavailable' collection`);
          totalCount += unavailableProductsEmailSnapshot.size;
        } catch (emailError) {
          console.error(`Error checking 'Products/${email}/Unavailable' collection:`, emailError);
        }
      }
    }

    console.log(`Total products count: ${totalCount}`);
    return totalCount;
  } catch (error) {
    console.error("Error getting products count:", error);
    return 0;
  }
};

/**
 * Get the count of pending reservations for a business
 * @param {string} businessId - Business ID or email
 * @returns {number} Count of pending reservations
 */
export const getPendingReservationsCount = async (businessId) => {
  try {
    console.log(`Fetching pending reservations for: ${businessId}`);
    const now = new Date();
    let totalPendingCount = 0;

    // Try to get the email from the businessId if it's not an email
    let email = businessId;
    let actualBusinessId = businessId;

    if (!businessId.includes('@')) {
      // Try to get the business document to extract the email
      try {
        const businessDoc = await getDoc(doc(db, "Businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          if (businessData.email) {
            email = businessData.email;
            console.log(`Found email ${email} for businessId ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting email from business document:", error);
      }
    } else {
      // If businessId is an email, try to get the actual business ID
      try {
        const businessQuery = query(
          collection(db, "Businesses"),
          where("email", "==", businessId)
        );
        const businessSnapshot = await getDocs(businessQuery);
        if (!businessSnapshot.empty) {
          const businessData = businessSnapshot.docs[0].data();
          if (businessData.businessId) {
            actualBusinessId = businessData.businessId;
            console.log(`Found actual businessId ${actualBusinessId} for email ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting actual businessId from email:", error);
      }
    }

    // Query for pending or confirmed bookings using businessId
    try {
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("businessId", "==", actualBusinessId),
        where("status", "in", ["pending", "confirmed"]),
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      console.log(`Found ${bookingsSnapshot.size} pending/confirmed bookings with businessId ${actualBusinessId}`);

      // Filter for bookings that are in the future
      const pendingBookings = bookingsSnapshot.docs.filter(doc => {
        const bookingData = doc.data();
        const bookingDate = bookingData.dateTime instanceof Timestamp
          ? bookingData.dateTime.toDate()
          : new Date(bookingData.dateTime);
        return bookingDate >= now;
      });

      console.log(`After filtering for future dates: ${pendingBookings.length} pending bookings with businessId ${actualBusinessId}`);
      totalPendingCount += pendingBookings.length;
    } catch (error) {
      console.error(`Error getting pending reservations with businessId ${actualBusinessId}:`, error);
    }

    // If email is different from actualBusinessId, also check using email
    if (email !== actualBusinessId) {
      try {
        const bookingsEmailQuery = query(
          collection(db, "bookings"),
          where("businessEmail", "==", email),
          where("status", "in", ["pending", "confirmed"]),
        );

        const bookingsEmailSnapshot = await getDocs(bookingsEmailQuery);
        console.log(`Found ${bookingsEmailSnapshot.size} pending/confirmed bookings with email ${email}`);

        // Filter for bookings that are in the future
        const pendingBookingsEmail = bookingsEmailSnapshot.docs.filter(doc => {
          const bookingData = doc.data();
          const bookingDate = bookingData.dateTime instanceof Timestamp
            ? bookingData.dateTime.toDate()
            : new Date(bookingData.dateTime);
          return bookingDate >= now;
        });

        console.log(`After filtering for future dates: ${pendingBookingsEmail.length} pending bookings with email ${email}`);
        totalPendingCount += pendingBookingsEmail.length;
      } catch (error) {
        console.error(`Error getting pending reservations with email ${email}:`, error);
      }
    }

    console.log(`Total pending reservations: ${totalPendingCount}`);
    return totalPendingCount;
  } catch (error) {
    console.error("Error getting pending reservations count:", error);
    return 0;
  }
};

/**
 * Get the total amount of payments received by a business
 * @param {string} businessId - Business ID or email
 * @returns {number} Total payments in rupees
 */
export const getPaymentsReceived = async (businessId) => {
  try {
    console.log(`Fetching payments received for: ${businessId}`);
    let totalPayments = 0;

    // Try to get the email from the businessId if it's not an email
    let email = businessId;
    let actualBusinessId = businessId;

    if (!businessId.includes('@')) {
      // Try to get the business document to extract the email
      try {
        const businessDoc = await getDoc(doc(db, "Businesses", businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          if (businessData.email) {
            email = businessData.email;
            console.log(`Found email ${email} for businessId ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting email from business document:", error);
      }
    } else {
      // If businessId is an email, try to get the actual business ID
      try {
        const businessQuery = query(
          collection(db, "Businesses"),
          where("email", "==", businessId)
        );
        const businessSnapshot = await getDocs(businessQuery);
        if (!businessSnapshot.empty) {
          const businessData = businessSnapshot.docs[0].data();
          if (businessData.businessId) {
            actualBusinessId = businessData.businessId;
            console.log(`Found actual businessId ${actualBusinessId} for email ${businessId}`);
          }
        }
      } catch (error) {
        console.error("Error getting actual businessId from email:", error);
      }
    }

    // Check for payments using businessId
    try {
      // Get payments from completed bookings using businessId
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("businessId", "==", actualBusinessId),
        where("status", "==", "completed")
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      console.log(`Found ${bookingsSnapshot.size} completed bookings with businessId ${actualBusinessId}`);

      bookingsSnapshot.forEach(doc => {
        const bookingData = doc.data();
        if (bookingData.price) {
          const price = parseFloat(bookingData.price);
          console.log(`Adding payment from booking ${doc.id}: ₹${price}`);
          totalPayments += price;
        }
      });

      // Get payments from completed orders using businessId - try multiple field names and collection paths

      // Try standard "orders" collection
      const ordersQuery = query(
        collection(db, "Orders"),
        where("businessId", "==", actualBusinessId),
        where("status", "==", "Completed")
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      console.log(`Found ${ordersSnapshot.size} completed orders with businessId ${actualBusinessId}`);

      ordersSnapshot.forEach(doc => {
        const orderData = doc.data();
        if (orderData.totalAmount) {
          const amount = parseFloat(orderData.totalAmount);
          console.log(`Adding payment from order ${doc.id}: ₹${amount}`);
          totalPayments += amount;
        } else if (orderData.amount) {
          const amount = parseFloat(orderData.amount);
          console.log(`Adding payment from order ${doc.id} (amount field): ₹${amount}`);
          totalPayments += amount;
        } else if (orderData.price) {
          const price = parseFloat(orderData.price);
          console.log(`Adding payment from order ${doc.id} (price field): ₹${price}`);
          totalPayments += price;
        }
      });

      // Try Orders collection with no status filter (may use different status values)


      // Try "Orders" uppercase collection


      // Try business-specific subcollection pattern (Businesses/{businessId}/Orders)

    } catch (error) {
      console.error(`Error getting payments with businessId ${actualBusinessId}:`, error);
    }

    // If actualBusinessId is different from email, also check using email
    if (email !== actualBusinessId) {
      try {
        // Get payments from completed bookings using email
        const bookingsEmailQuery = query(
          collection(db, "bookings"),
          where("businessEmail", "==", email),
          where("status", "==", "completed")
        );

        const bookingsEmailSnapshot = await getDocs(bookingsEmailQuery);
        console.log(`Found ${bookingsEmailSnapshot.size} completed bookings with email ${email}`);

        bookingsEmailSnapshot.forEach(doc => {
          const bookingData = doc.data();
          if (bookingData.price) {
            const price = parseFloat(bookingData.price);
            console.log(`Adding payment from booking (by email) ${doc.id}: ₹${price}`);
            totalPayments += price;
          }
        });

        // Get payments from completed orders using email - check multiple field names and patterns

        // Try standard orders collection with businessEmail field
        const ordersEmailQuery = query(
          collection(db, "orders"),
          where("businessEmail", "==", email),
          where("status", "==", "completed")
        );

        const ordersEmailSnapshot = await getDocs(ordersEmailQuery);
        console.log(`Found ${ordersEmailSnapshot.size} completed orders with businessEmail=${email}`);

        ordersEmailSnapshot.forEach(doc => {
          const orderData = doc.data();
          if (orderData.totalAmount) {
            const amount = parseFloat(orderData.totalAmount);
            console.log(`Adding payment from order (by email) ${doc.id}: ₹${amount}`);
            totalPayments += amount;
          } else if (orderData.amount) {
            const amount = parseFloat(orderData.amount);
            console.log(`Adding payment from order (by email) ${doc.id} (amount field): ₹${amount}`);
            totalPayments += amount;
          } else if (orderData.price) {
            const price = parseFloat(orderData.price);
            console.log(`Adding payment from order (by email) ${doc.id} (price field): ₹${price}`);
            totalPayments += price;
          }
        });

        // Try orders with email field instead of businessEmail
        try {
          const ordersAltEmailQuery = query(
            collection(db, "orders"),
            where("email", "==", email),
            where("status", "==", "completed")
          );

          const ordersAltEmailSnapshot = await getDocs(ordersAltEmailQuery);
          console.log(`Found ${ordersAltEmailSnapshot.size} completed orders with email field=${email}`);

          ordersAltEmailSnapshot.forEach(doc => {
            const orderData = doc.data();
            if (orderData.totalAmount) {
              const amount = parseFloat(orderData.totalAmount);
              console.log(`Adding payment from order (by alt email) ${doc.id}: ₹${amount}`);
              totalPayments += amount;
            } else if (orderData.amount) {
              const amount = parseFloat(orderData.amount);
              console.log(`Adding payment from order (by alt email) ${doc.id} (amount field): ₹${amount}`);
              totalPayments += amount;
            } else if (orderData.price) {
              const price = parseFloat(orderData.price);
              console.log(`Adding payment from order (by alt email) ${doc.id} (price field): ₹${price}`);
              totalPayments += price;
            }
          });
        } catch (error) {
          console.error(`Error checking orders with email field=${email}:`, error);
        }

        // Try uppercase Orders collection
        try {
          const upperOrdersEmailQuery = query(
            collection(db, "Orders"),
            where("businessEmail", "==", email)
          );

          const upperOrdersEmailSnapshot = await getDocs(upperOrdersEmailQuery);
          console.log(`Found ${upperOrdersEmailSnapshot.size} orders in uppercase 'Orders' collection with email ${email}`);

          upperOrdersEmailSnapshot.forEach(doc => {
            const orderData = doc.data();
            if (!orderData.status ||
              orderData.status === "completed" ||
              orderData.status === "delivered" ||
              orderData.status === "paid") {

              if (orderData.totalAmount) {
                const amount = parseFloat(orderData.totalAmount);
                console.log(`Adding payment from uppercase Orders (email) ${doc.id}: ₹${amount}`);
                totalPayments += amount;
              } else if (orderData.amount) {
                const amount = parseFloat(orderData.amount);
                console.log(`Adding payment from uppercase Orders (email) ${doc.id} (amount field): ₹${amount}`);
                totalPayments += amount;
              } else if (orderData.price) {
                const price = parseFloat(orderData.price);
                console.log(`Adding payment from uppercase Orders (email) ${doc.id} (price field): ₹${price}`);
                totalPayments += price;
              }
            }
          });
        } catch (error) {
          console.error("Error checking uppercase 'Orders' collection by email:", error);
        }

        // Try business-specific subcollection pattern (Products/{email}/Orders)
        try {
          const businessOrdersEmailRef = collection(db, "Products", email, "Orders");
          const businessOrdersEmailSnapshot = await getDocs(businessOrdersEmailRef);
          console.log(`Found ${businessOrdersEmailSnapshot.size} orders in 'Products/${email}/Orders' subcollection`);

          businessOrdersEmailSnapshot.forEach(doc => {
            const orderData = doc.data();
            if (!orderData.status ||
              orderData.status === "completed" ||
              orderData.status === "delivered" ||
              orderData.status === "paid") {

              if (orderData.totalAmount) {
                const amount = parseFloat(orderData.totalAmount);
                console.log(`Adding payment from Products/${email}/Orders ${doc.id}: ₹${amount}`);
                totalPayments += amount;
              } else if (orderData.amount) {
                const amount = parseFloat(orderData.amount);
                console.log(`Adding payment from Products/${email}/Orders ${doc.id} (amount field): ₹${amount}`);
                totalPayments += amount;
              } else if (orderData.price) {
                const price = parseFloat(orderData.price);
                console.log(`Adding payment from Products/${email}/Orders ${doc.id} (price field): ₹${price}`);
                totalPayments += price;
              }
            }
          });
        } catch (error) {
          // This is expected to fail if the collection doesn't exist, so we don't log it as an error
          console.log(`No orders found in 'Products/${email}/Orders' subcollection`);
        }
      } catch (error) {
        console.error(`Error getting payments with email ${email}:`, error);
      }
    }

    console.log(`Total payments received: ₹${totalPayments}`);
    return totalPayments;
  } catch (error) {
    console.error("Error getting payments received:", error);
    return 0;
  }
};

/**
 * Get average rating and total number of reviews for a business
 * @param {string} businessId - Business ID
 * @returns {Object} Object with average rating and total reviews
 */
export const getRatingStats = async (businessId) => {
  try {
    console.log(`Fetching rating stats for business ID: ${businessId}`);
    let totalRatingSum = 0;
    let totalReviewCount = 0;

    // 1. First check in "reviews" collection
    try {
      const reviewsQuery = query(
        collection(db, "Reviews"),
        where("businessId", "==", businessId)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      console.log(`Found ${reviewsSnapshot.size} reviews in 'Reviews' collection`);

      reviewsSnapshot.forEach(doc => {
        const reviewData = doc.data();
        if (reviewData.rating) {
          totalRatingSum += reviewData.rating;
          totalReviewCount++;
        }
      });
    } catch (error) {
      console.error("Error checking 'reviews' collection:", error);
    }

    // 2. Check business document itself for rating - try both email as ID and businessId
    try {
      console.log("Attempting to get business document by businessId and by email");

      // First try - check if businessId is actually an email (commonly used as document ID)
      if (businessId.includes('@')) {
        console.log(`businessId looks like an email, trying to use it as document ID: ${businessId}`);
        const businessDocByEmail = await getDoc(doc(db, "Businesses", businessId));

        if (businessDocByEmail.exists()) {
          const businessData = businessDocByEmail.data();
          console.log("Business document found by email ID:", businessData);

          if (businessData.rating) {
            const reviewCount = businessData.reviewCount || 1; // Default to 1 if reviewCount is missing
            console.log(`Found rating in business document (by email): ${businessData.rating} (${reviewCount} reviews)`);
            totalRatingSum += (businessData.rating * reviewCount);
            totalReviewCount += reviewCount;
          }
        }
      }

      // Second try - typical "businesses" lowercase collection with businessId field
      const businessDocLowercase = await getDoc(doc(db, "businesses", businessId));
      if (businessDocLowercase.exists()) {
        const businessData = businessDocLowercase.data();
        if (businessData.rating) {
          const reviewCount = businessData.reviewCount || 1;
          console.log(`Found rating in lowercase 'businesses' document: ${businessData.rating} (${reviewCount} reviews)`);
          totalRatingSum += (businessData.rating * reviewCount);
          totalReviewCount += reviewCount;
        }
      }

      // Third try - uppercase "Businesses" collection with businessId field
      const businessDocUppercase = await getDoc(doc(db, "Businesses", businessId));
      if (businessDocUppercase.exists()) {
        const businessData = businessDocUppercase.data();
        if (businessData.rating) {
          const reviewCount = businessData.reviewCount || 1;
          console.log(`Found rating in uppercase 'Businesses' document: ${businessData.rating} (${reviewCount} reviews)`);
          totalRatingSum += (businessData.rating * reviewCount);
          totalReviewCount += reviewCount;
        }
      }
    } catch (error) {
      console.error("Error checking business document for rating:", error);
    }

    // 3. Check in services for ratings
    try {
      // Try to get the email from the businessId if it's not an email
      let email = businessId;
      if (!businessId.includes('@')) {
        // Try to get the business document to extract the email
        try {
          const businessDoc = await getDoc(doc(db, "Businesses", businessId));
          if (businessDoc.exists()) {
            const businessData = businessDoc.data();
            if (businessData.email) {
              email = businessData.email;
              console.log(`Found email ${email} for businessId ${businessId}`);
            }
          }
        } catch (error) {
          console.error("Error getting email from business document:", error);
        }
      }

      // Try lowercase 'services' collection
      const servicesQuery = query(
        collection(db, "services"),
        where("businessId", "==", businessId)
      );
      const servicesSnapshot = await getDocs(servicesQuery);

      servicesSnapshot.forEach(doc => {
        const serviceData = doc.data();
        if (serviceData.rating && serviceData.reviewCount) {
          console.log(`Service ${doc.id} has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
          totalRatingSum += (serviceData.rating * serviceData.reviewCount);
          totalReviewCount += serviceData.reviewCount;
        }
      });

      // Try lowercase 'services' collection with email
      if (email !== businessId) {
        const servicesEmailQuery = query(
          collection(db, "services"),
          where("email", "==", email)
        );
        const servicesEmailSnapshot = await getDocs(servicesEmailQuery);

        servicesEmailSnapshot.forEach(doc => {
          const serviceData = doc.data();
          if (serviceData.rating && serviceData.reviewCount) {
            console.log(`Service ${doc.id} (by email) has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
            totalRatingSum += (serviceData.rating * serviceData.reviewCount);
            totalReviewCount += serviceData.reviewCount;
          }
        });
      }

      // Try uppercase 'Services' collection with Active subcollection - try both businessId and email
      try {
        const activeServicesRef = collection(db, "Services", businessId, "Active");
        const activeServicesSnapshot = await getDocs(activeServicesRef);

        activeServicesSnapshot.forEach(doc => {
          const serviceData = doc.data();
          if (serviceData.rating && serviceData.reviewCount) {
            console.log(`Service ${doc.id} (Active) has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
            totalRatingSum += (serviceData.rating * serviceData.reviewCount);
            totalReviewCount += serviceData.reviewCount;
          } else if (serviceData.rating) {
            // If rating exists but no reviewCount, assume 1 review
            console.log(`Service ${doc.id} (Active) has rating: ${serviceData.rating} but no reviewCount, assuming 1`);
            totalRatingSum += serviceData.rating;
            totalReviewCount += 1;
          }
        });
      } catch (error) {
        console.log(`Error checking 'Services/${businessId}/Active', trying with email`);

        try {
          // Try with email
          const activeServicesEmailRef = collection(db, "Services", email, "Active");
          const activeServicesEmailSnapshot = await getDocs(activeServicesEmailRef);

          activeServicesEmailSnapshot.forEach(doc => {
            const serviceData = doc.data();
            if (serviceData.rating && serviceData.reviewCount) {
              console.log(`Service ${doc.id} (Active by email) has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
              totalRatingSum += (serviceData.rating * serviceData.reviewCount);
              totalReviewCount += serviceData.reviewCount;
            } else if (serviceData.rating) {
              // If rating exists but no reviewCount, assume 1 review
              console.log(`Service ${doc.id} (Active by email) has rating: ${serviceData.rating} but no reviewCount, assuming 1`);
              totalRatingSum += serviceData.rating;
              totalReviewCount += 1;
            }
          });
        } catch (emailError) {
          console.error(`Error checking 'Services/${email}/Active':`, emailError);
        }
      }

      // Try ActiveServices subcollection - try both businessId and email
      try {
        const activeServicesAltRef = collection(db, "Services", businessId, "ActiveServices");
        const activeServicesAltSnapshot = await getDocs(activeServicesAltRef);

        activeServicesAltSnapshot.forEach(doc => {
          const serviceData = doc.data();
          if (serviceData.rating && serviceData.reviewCount) {
            console.log(`Service ${doc.id} (ActiveServices) has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
            totalRatingSum += (serviceData.rating * serviceData.reviewCount);
            totalReviewCount += serviceData.reviewCount;
          } else if (serviceData.rating) {
            // If rating exists but no reviewCount, assume 1 review
            console.log(`Service ${doc.id} (ActiveServices) has rating: ${serviceData.rating} but no reviewCount, assuming 1`);
            totalRatingSum += serviceData.rating;
            totalReviewCount += 1;
          }
        });
      } catch (error) {
        console.log(`Error checking 'Services/${businessId}/ActiveServices', trying with email`);

        try {
          // Try with email
          const activeServicesAltEmailRef = collection(db, "Services", email, "ActiveServices");
          const activeServicesAltEmailSnapshot = await getDocs(activeServicesAltEmailRef);

          activeServicesAltEmailSnapshot.forEach(doc => {
            const serviceData = doc.data();
            if (serviceData.rating && serviceData.reviewCount) {
              console.log(`Service ${doc.id} (ActiveServices by email) has rating: ${serviceData.rating} (${serviceData.reviewCount} reviews)`);
              totalRatingSum += (serviceData.rating * serviceData.reviewCount);
              totalReviewCount += serviceData.reviewCount;
            } else if (serviceData.rating) {
              // If rating exists but no reviewCount, assume 1 review
              console.log(`Service ${doc.id} (ActiveServices by email) has rating: ${serviceData.rating} but no reviewCount, assuming 1`);
              totalRatingSum += serviceData.rating;
              totalReviewCount += 1;
            }
          });
        } catch (emailError) {
          console.error(`Error checking 'Services/${email}/ActiveServices':`, emailError);
        }
      }
    } catch (error) {
      console.error("Error checking services for ratings:", error);
    }

    // 4. Check in products for ratings
    try {
      // Check lowercase 'products' collection
      const productsQuery = query(
        collection(db, "products"),
        where("businessId", "==", businessId)
      );
      const productsSnapshot = await getDocs(productsQuery);

      productsSnapshot.forEach(doc => {
        const productData = doc.data();
        if (productData.rating && productData.reviewCount) {
          console.log(`Product ${doc.id} has rating: ${productData.rating} (${productData.reviewCount} reviews)`);
          totalRatingSum += (productData.rating * productData.reviewCount);
          totalReviewCount += productData.reviewCount;
        }
      });

      // Check uppercase 'Products' with Available subcollection
      const availableProductsRef = collection(db, "Products", businessId, "Available");
      const availableProductsSnapshot = await getDocs(availableProductsRef);

      availableProductsSnapshot.forEach(doc => {
        const productData = doc.data();
        if (productData.rating && productData.reviewCount) {
          console.log(`Product ${doc.id} (Available) has rating: ${productData.rating} (${productData.reviewCount} reviews)`);
          totalRatingSum += (productData.rating * productData.reviewCount);
          totalReviewCount += productData.reviewCount;
        }
      });

      // Check Unavailable products too
      const unavailableProductsRef = collection(db, "Products", businessId, "Unavailable");
      const unavailableProductsSnapshot = await getDocs(unavailableProductsRef);

      unavailableProductsSnapshot.forEach(doc => {
        const productData = doc.data();
        if (productData.rating && productData.reviewCount) {
          console.log(`Product ${doc.id} (Unavailable) has rating: ${productData.rating} (${productData.reviewCount} reviews)`);
          totalRatingSum += (productData.rating * productData.reviewCount);
          totalReviewCount += productData.reviewCount;
        }
      });
    } catch (error) {
      console.error("Error checking products for ratings:", error);
    }

    console.log(`Total rating calculation: ${totalRatingSum} / ${totalReviewCount}`);

    if (totalReviewCount === 0) {
      return { average: 0, total: 0 };
    }

    const averageRating = totalRatingSum / totalReviewCount;
    return {
      average: parseFloat(averageRating.toFixed(1)),
      total: totalReviewCount
    };
  } catch (error) {
    console.error("Error getting rating stats:", error);
    return { average: 0, total: 0 };
  }
};
