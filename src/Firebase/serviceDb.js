// src/Firebase/serviceDb.js
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    query,
    where,
    addDoc
} from "firebase/firestore";
import { db } from "./config";
import { uploadToCloudinary } from "./cloudinary";

/**
 * Firebase Collection Structure:
 * 
 * Services Collection
 * └── businessEmail (document ID)
 *     ├── businessName, businessId, etc. (document fields)
 *     ├── Active (subcollection)
 *     │   └── serviceId1 (document)
 *     │       └── {...serviceData} (document fields)
 *     └── Inactive (subcollection)
 *         └── serviceId2 (document)
 *             └── {...serviceData} (document fields)
 * 
 * Services are stored in either "Active" or "Inactive" subcollection 
 * based on their isActive status.
 */

// Ensure business document exists with Active and Inactive subcollections
const ensureBusinessDocExists = async (businessEmail, businessData) => {
    const businessDocRef = doc(db, 'Services', businessEmail);
    const docSnap = await getDoc(businessDocRef);

    if (!docSnap.exists()) {
        // Create the business document with basic info
        await setDoc(businessDocRef, {
            businessName: businessData.businessName || '',
            businessId: businessData.businessId || '',
            createdAt: new Date().toISOString(),
            email: businessEmail
        });

        // Create empty documents in both subcollections to ensure they exist
        // These will be automatically deleted when empty
        const activeRef = collection(businessDocRef, 'Active');
        const inactiveRef = collection(businessDocRef, 'Inactive');

        console.log(`Created Services/${businessEmail} document with Active and Inactive subcollections`);
    }
    return businessDocRef;
};

// Upload service images to Cloudinary
const uploadServiceImages = async (images, businessId, serviceId) => {
    if (!images || images.length === 0) return [];

    // Debug log the images array
    console.log(`Uploading images for service ${serviceId}:`,
        JSON.stringify(images.map(img => ({
            id: img.id,
            hasFile: !!img.file,
            hasUrl: !!img.url,
            hasPreview: !!img.preview
        })))
    );

    const uploadPromises = images.map(async (image, index) => {
        // Skip upload for images that already have a Cloudinary URL
        if (image.url && !image.file) {
            return {
                id: image.id || `img_${index}`,
                name: image.name || `Image ${index + 1}`,
                url: image.url,
                public_id: image.public_id || `manual_id_${index}`,
                folder: image.folder || '',
                full_path: image.full_path || ''
            };
        }

        // For new images or updated images
        try {
            // Create a proper folder structure: UdhyogUnity/businessId/Services/serviceId
            const folder = `UdhyogUnity/${businessId}/Services/${serviceId}`;
            // Format the folder path correctly for Cloudinary
            const formattedFolder = folder.replace(/^\/|\/$/g, '');

            // Use a unique name for each image
            const imageName = `service_image_${index + 1}`;
            const fullPathPublicId = `${formattedFolder}/${imageName}`;

            // Get the image file or blob from preview
            let fileBlob;
            if (image.file) {
                fileBlob = image.file;
            } else if (image.preview && image.preview.startsWith('data:')) {
                const res = await fetch(image.preview);
                fileBlob = await res.blob();
            } else {
                // If neither file nor valid preview exists, return the image as is
                return image;
            }

            // Upload to Cloudinary
            const result = await uploadToCloudinary(fileBlob, '', fullPathPublicId);

            // Return the Cloudinary result with additional metadata
            return {
                id: image.id || `img_${index}`,
                name: image.name || `Image ${index + 1}`,
                url: result.url,
                public_id: result.public_id || '',
                folder: result.folder || '',
                full_path: result.full_path || ''
            };
        } catch (error) {
            console.error(`Failed to upload image ${index}:`, error);
            throw error;
        }
    });

    return Promise.all(uploadPromises);
};

// Add a new service
export const addService = async (serviceData, businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        // Debug log
        console.log('Service data received:', JSON.stringify(serviceData, (key, value) =>
            value === undefined ? '<<UNDEFINED>>' : value));

        const businessEmail = businessData.email;
        const businessId = businessData.businessName?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'business_' + Date.now();
        const tempServiceId = 'temp_' + Date.now(); // Temporary ID for image upload

        // Ensure business document exists in Services collection
        await ensureBusinessDocExists(businessEmail, businessData);

        // Upload service images to Cloudinary
        const uploadedImages = await uploadServiceImages(serviceData.images, businessId, tempServiceId);

        // Prepare service data for Firestore
        const preparedData = {
            ...serviceData,
            images: uploadedImages,
            businessEmail,
            businessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Clean up any undefined values which Firestore doesn't accept
        Object.keys(preparedData).forEach(key => {
            if (preparedData[key] === undefined) {
                console.log(`Removing undefined value for key: ${key}`);
                delete preparedData[key];
            }
        });

        // Determine subcollection based on isActive status
        const subcollection = serviceData.isActive ? 'Active' : 'Inactive';
        const businessDocRef = doc(db, 'Services', businessEmail);
        const servicesCollectionRef = collection(businessDocRef, subcollection);

        // Add to appropriate subcollection
        const docRef = await addDoc(servicesCollectionRef, preparedData);
        const newServiceId = docRef.id;

        // Update the document to include its ID in the data too and update the image paths
        const serviceRef = doc(businessDocRef, subcollection, newServiceId);

        // Re-upload images with correct serviceId if needed
        if (uploadedImages.length > 0) {
            const updatedImages = await uploadServiceImages(uploadedImages.map(img => ({
                ...img,
                // For images that need to be re-uploaded, we'd need to add the file property
                // But since we don't have access to the original files here, we'll leave as is
            })), businessId, newServiceId);

            await updateDoc(serviceRef, {
                serviceId: newServiceId,
                images: updatedImages
            });
        } else {
            await updateDoc(serviceRef, { serviceId: newServiceId });
        }

        return {
            id: newServiceId,
            serviceId: newServiceId,
            ...preparedData
        };
    } catch (error) {
        console.error("Error adding service:", error);
        throw error;
    }
};

// Update an existing service
export const updateService = async (serviceId, serviceData, businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        const businessEmail = businessData.email;
        const businessId = businessData.businessName?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'business_' + Date.now();

        // Ensure business document exists
        await ensureBusinessDocExists(businessEmail, businessData);

        // Determine current subcollection
        const businessDocRef = doc(db, 'Services', businessEmail);
        const activeServiceRef = doc(businessDocRef, 'Active', serviceId);
        const inactiveServiceRef = doc(businessDocRef, 'Inactive', serviceId);

        let currentServiceDoc = await getDoc(activeServiceRef);
        let currentSubcollection = 'Active';

        if (!currentServiceDoc.exists()) {
            currentServiceDoc = await getDoc(inactiveServiceRef);
            currentSubcollection = 'Inactive';

            if (!currentServiceDoc.exists()) {
                throw new Error("Service not found");
            }
        }

        const currentService = currentServiceDoc.data();

        // Determine new subcollection based on isActive status
        const newSubcollection = serviceData.isActive ? 'Active' : 'Inactive';

        // Upload new images to Cloudinary if any
        let processedImages = [...(currentService.images || [])];

        // Handle new images to be uploaded
        if (serviceData.images && serviceData.images.length > 0) {
            const uploadedImages = await uploadServiceImages(
                serviceData.images.filter(img => img.file || (img.preview && !img.url)),
                businessId,
                serviceId
            );

            // Combine existing images with new ones, avoiding duplicates
            const existingImageUrls = processedImages.map(img => img.url);
            const newImages = uploadedImages.filter(img => !existingImageUrls.includes(img.url));
            processedImages = [...processedImages, ...newImages];
        }

        // Filter out removed images if specified
        if (serviceData.removedImageIds && serviceData.removedImageIds.length > 0) {
            processedImages = processedImages.filter(
                image => !serviceData.removedImageIds.includes(image.id || image.public_id)
            );
        }

        // Prepare updated service data
        const updatedService = {
            ...serviceData,
            images: processedImages,
            businessEmail,
            businessId,
            serviceId,
            updatedAt: new Date().toISOString()
        };

        // Remove temporary fields
        delete updatedService.removedImageIds;

        // Clean up any undefined values which Firestore doesn't accept
        Object.keys(updatedService).forEach(key => {
            if (updatedService[key] === undefined) {
                console.log(`Removing undefined value for key: ${key}`);
                delete updatedService[key];
            }
        });

        // If subcollection changed, move the document
        if (currentSubcollection !== newSubcollection) {
            // Delete from old subcollection
            const oldServiceRef = doc(businessDocRef, currentSubcollection, serviceId);
            await deleteDoc(oldServiceRef);

            // Add to new subcollection with same ID
            const newServiceRef = doc(businessDocRef, newSubcollection, serviceId);
            await setDoc(newServiceRef, updatedService);
        } else {
            // Update in the same subcollection
            const serviceRef = doc(businessDocRef, currentSubcollection, serviceId);
            await updateDoc(serviceRef, updatedService);
        }

        return {
            id: serviceId,
            serviceId,
            ...updatedService
        };
    } catch (error) {
        console.error("Error updating service:", error);
        throw error;
    }
};

// Delete a service
export const deleteService = async (serviceId, businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        const businessEmail = businessData.email;
        const businessDocRef = doc(db, 'Services', businessEmail);

        // Check both subcollections for the service
        const activeServiceRef = doc(businessDocRef, 'Active', serviceId);
        const inactiveServiceRef = doc(businessDocRef, 'Inactive', serviceId);

        const activeDoc = await getDoc(activeServiceRef);
        const inactiveDoc = await getDoc(inactiveServiceRef);

        if (activeDoc.exists()) {
            await deleteDoc(activeServiceRef);
            return true;
        } else if (inactiveDoc.exists()) {
            await deleteDoc(inactiveServiceRef);
            return true;
        } else {
            throw new Error("Service not found");
        }
    } catch (error) {
        console.error("Error deleting service:", error);
        throw error;
    }
};

// Get all services for a business
export const getBusinessServices = async (businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        const businessEmail = businessData.email;
        const businessDocRef = doc(db, 'Services', businessEmail);

        // Check if the business document exists
        const businessDocSnap = await getDoc(businessDocRef);
        if (!businessDocSnap.exists()) {
            return [];
        }

        // Get services from both Active and Inactive subcollections
        const activeServicesRef = collection(businessDocRef, 'Active');
        const inactiveServicesRef = collection(businessDocRef, 'Inactive');

        const activeSnapshot = await getDocs(activeServicesRef);
        const inactiveSnapshot = await getDocs(inactiveServicesRef);

        const servicesData = [];

        // Process active services
        activeSnapshot.forEach((doc) => {
            const data = doc.data();
            servicesData.push({
                id: doc.id,
                serviceId: doc.id,
                ...data,
                isActive: true // Ensure isActive is true regardless of stored data
            });
        });

        // Process inactive services
        inactiveSnapshot.forEach((doc) => {
            const data = doc.data();
            servicesData.push({
                id: doc.id,
                serviceId: doc.id,
                ...data,
                isActive: false // Ensure isActive is false regardless of stored data
            });
        });

        // Sort by creation date (newest first)
        return servicesData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error getting business services:", error);
        throw error;
    }
};

// Get a single service by ID
export const getServiceById = async (serviceId, businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        const businessEmail = businessData.email;
        const businessDocRef = doc(db, 'Services', businessEmail);

        // Check both subcollections
        const activeServiceRef = doc(businessDocRef, 'Active', serviceId);
        const inactiveServiceRef = doc(businessDocRef, 'Inactive', serviceId);

        const activeDoc = await getDoc(activeServiceRef);
        if (activeDoc.exists()) {
            return {
                id: serviceId,
                serviceId,
                ...activeDoc.data(),
                isActive: true
            };
        }

        const inactiveDoc = await getDoc(inactiveServiceRef);
        if (inactiveDoc.exists()) {
            return {
                id: serviceId,
                serviceId,
                ...inactiveDoc.data(),
                isActive: false
            };
        }

        throw new Error("Service not found");
    } catch (error) {
        console.error("Error getting service:", error);
        throw error;
    }
};

// Toggle service active status
export const toggleServiceStatus = async (serviceId, isActive, businessData) => {
    try {
        if (!businessData || !businessData.email) {
            throw new Error('Business data is missing or incomplete');
        }

        const businessEmail = businessData.email;
        const businessDocRef = doc(db, 'Services', businessEmail);

        // Determine current and target subcollections
        const currentSubcollection = isActive ? 'Inactive' : 'Active';
        const targetSubcollection = isActive ? 'Active' : 'Inactive';

        // Get the service document from the current subcollection
        const currentServiceRef = doc(businessDocRef, currentSubcollection, serviceId);
        const serviceDoc = await getDoc(currentServiceRef);

        if (!serviceDoc.exists()) {
            throw new Error("Service not found in expected subcollection");
        }

        // Get the service data
        const serviceData = serviceDoc.data();

        // Update the isActive status
        const updatedService = {
            ...serviceData,
            isActive,
            updatedAt: new Date().toISOString()
        };

        // Delete from current subcollection
        await deleteDoc(currentServiceRef);

        // Add to target subcollection with same ID
        const targetServiceRef = doc(businessDocRef, targetSubcollection, serviceId);
        await setDoc(targetServiceRef, updatedService);

        return {
            id: serviceId,
            serviceId,
            ...updatedService
        };
    } catch (error) {
        console.error("Error toggling service status:", error);
        throw error;
    }
};
