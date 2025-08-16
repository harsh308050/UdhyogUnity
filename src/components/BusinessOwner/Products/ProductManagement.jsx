import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import ProductView from './ProductView';
import { uploadToCloudinary } from '../../../Firebase/cloudinary';
import { db } from '../../../Firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import './Products.css';

const ProductManagement = ({ businessData }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'add', 'edit', 'view'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [uploading, setUploading] = useState(false);

    const navigate = useNavigate();

    // Fetch products on component mount
    useEffect(() => {
        fetchProducts();
    }, [businessData]);

    // Fetch products from Firestore
    const fetchProducts = async () => {
        try {
            setLoading(true);

            if (!businessData || !businessData.email) {
                console.error('Business data is missing or incomplete');
                setLoading(false);
                return;
            }

            const businessEmail = businessData.email;

            // Check if the business document exists
            const businessDocRef = doc(db, 'Products', businessEmail);
            const businessDocSnap = await getDoc(businessDocRef);

            // If business document doesn't exist yet, return empty products array
            if (!businessDocSnap.exists()) {
                setProducts([]);
                setLoading(false);
                return;
            }

            // Get products from both Available and Unavailable subcollections
            const availableProductsRef = collection(businessDocRef, 'Available');
            const unavailableProductsRef = collection(businessDocRef, 'Unavailable');

            const availableSnapshot = await getDocs(availableProductsRef);
            const unavailableSnapshot = await getDocs(unavailableProductsRef);

            const productsData = [];

            // Process available products
            availableSnapshot.forEach((doc) => {
                const data = doc.data();
                console.log(`Fetched Available product: ${doc.id}`);
                productsData.push({
                    productId: doc.id,
                    ...data,
                    inStock: true // Ensure inStock is true regardless of stored data
                });
            });

            // Process unavailable products
            unavailableSnapshot.forEach((doc) => {
                const data = doc.data();
                console.log(`Fetched Unavailable product: ${doc.id}`);
                productsData.push({
                    productId: doc.id,
                    ...data,
                    inStock: false // Ensure inStock is false regardless of stored data
                });
            });

            setProducts(productsData);

        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle adding new product
    const handleAddProduct = () => {
        setSelectedProduct(null);
        setView('add');
    };

    // Handle editing a product
    const handleEditProduct = (product) => {
        setSelectedProduct(product);
        setView('edit');
    };

    // Handle viewing a product
    const handleViewProduct = (product) => {
        setSelectedProduct(product);
        setView('view');
    };

    // Handle product deletion confirmation
    const handleDeleteConfirmation = (productId) => {
        setConfirmDelete(productId);
    };

    // Handle product deletion
    const handleDeleteProduct = async () => {
        if (!confirmDelete) return;

        try {
            if (!businessData || !businessData.email) {
                throw new Error('Business data is missing or incomplete');
            }

            const businessEmail = businessData.email;

            // Find the product to determine if it's in Available or Unavailable collection
            const productToDelete = products.find(p => p.productId === confirmDelete);

            if (!productToDelete) {
                throw new Error('Product not found');
            }

            // Determine the correct subcollection
            const subcollection = productToDelete.inStock ? 'Available' : 'Unavailable';

            const productDocRef = doc(db, 'Products', businessEmail, subcollection, confirmDelete);
            await deleteDoc(productDocRef);

            // Update local state
            setProducts(prevProducts => prevProducts.filter(p => p.productId !== confirmDelete));
            setConfirmDelete(null);

            toast.success('Product deleted successfully');

        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product. Please try again.');
        }
    };

    // Upload product images to Cloudinary
    const uploadProductImages = async (images, businessId, productId) => {
        if (!images || images.length === 0) return [];

        const uploadPromises = images.map(async (image, index) => {
            // Skip upload for images that already have a Cloudinary URL
            if (image.url && !image.file) {
                return image;
            }

            // For new images or updated images
            try {
                // Create a proper folder structure: UdhyogUnity/businessId/Products/productId
                const folder = `UdhyogUnity/${businessId}/Products/${productId}`;
                // Format the folder path correctly for Cloudinary
                const formattedFolder = folder.replace(/^\/|\/$/g, '');

                // Use a unique name for each image
                const imageName = `product_image_${index + 1}`;
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
                    id: image.id,
                    name: image.name,
                    url: result.url,
                    public_id: result.public_id,
                    folder: result.folder,
                    full_path: result.full_path
                };
            } catch (error) {
                console.error(`Failed to upload image ${index}:`, error);
                throw error;
            }
        });

        return Promise.all(uploadPromises);
    };

    // Ensure business document exists with Available and Unavailable subcollections
    const ensureBusinessDocExists = async (businessEmail, businessData) => {
        const businessDocRef = doc(db, 'Products', businessEmail);
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
            const availableRef = collection(businessDocRef, 'Available');
            const unavailableRef = collection(businessDocRef, 'Unavailable');

            // Log creation of structure
            console.log(`Created Products/${businessEmail} document with Available and Unavailable subcollections`);
        }
        return businessDocRef;
    };

    // Process and save product data
    const saveProduct = async (formData) => {
        try {
            setUploading(true);

            if (!businessData || !businessData.email) {
                throw new Error('Business data is missing or incomplete');
            }

            const businessEmail = businessData.email;
            const businessId = businessData.businessName?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'business_' + Date.now();
            const productId = formData.productId;

            // Ensure business document exists in Products collection
            await ensureBusinessDocExists(businessEmail, businessData);

            // Upload product images to Cloudinary
            const uploadedImages = await uploadProductImages(formData.images, businessId, productId);

            // Prepare product data for Firestore
            const productData = {
                ...formData,
                images: uploadedImages,
                businessEmail,
                businessId,
                productId: productId, // Ensure productId is included in the data
                updatedAt: new Date().toISOString()
            };

            // Determine if this is an add or edit operation
            const isEditing = view === 'edit';
            const businessDocRef = doc(db, 'Products', businessEmail);

            // Determine subcollection based on inStock status
            const subcollection = productData.inStock ? 'Available' : 'Unavailable';

            console.log(`Saving product to subcollection: ${subcollection}`);
            console.log(`Product is ${productData.inStock ? 'in stock' : 'out of stock'}`);

            if (isEditing) {
                try {
                    // If product's inStock status changed, we need to move it between collections
                    const oldProduct = products.find(p => p.productId === productId);

                    if (!oldProduct) {
                        console.error(`Product with ID ${productId} not found in local state`);
                        throw new Error(`Product not found. Please refresh and try again.`);
                    }

                    const oldSubcollection = oldProduct?.inStock ? 'Available' : 'Unavailable';

                    console.log(`Editing product ${productId}`);
                    console.log(`Product name: ${oldProduct.name}`);
                    console.log(`Old subcollection: ${oldSubcollection}, New subcollection: ${subcollection}`);

                    if (oldSubcollection !== subcollection) {
                        console.log(`Moving product from ${oldSubcollection} to ${subcollection}`);

                        // Delete from old collection
                        const oldProductRef = doc(businessDocRef, oldSubcollection, productId);
                        await deleteDoc(oldProductRef);
                        console.log(`Deleted from ${oldSubcollection}`);

                        // Add to new collection with SAME ID to prevent duplication
                        const newProductRef = doc(businessDocRef, subcollection, productId);
                        await setDoc(newProductRef, productData);
                        console.log(`Added to ${subcollection} with SAME ID: ${productId}`);
                    } else {
                        // Update existing product in the same collection
                        const productRef = doc(businessDocRef, subcollection, productId);
                        await updateDoc(productRef, productData);
                        console.log(`Updated in the same subcollection: ${subcollection}`);
                    }

                    // Update local state - keep original productId
                    setProducts(prevProducts =>
                        prevProducts.map(p => p.productId === productId ? { ...productData, productId } : p)
                    );

                    toast.success('Product updated successfully');
                } catch (error) {
                    console.error('Error updating product location:', error);
                    toast.error('Failed to update product. Please try again.');
                }
            } else {
                try {
                    // Add new product to the appropriate subcollection
                    console.log(`Adding new product to ${subcollection}`);

                    const productsCollectionRef = collection(businessDocRef, subcollection);
                    const docRef = await addDoc(productsCollectionRef, productData);
                    const newProductId = docRef.id;
                    console.log(`Added with ID: ${newProductId}`);

                    // Update the document to include its ID in the data too
                    const productRef = doc(businessDocRef, subcollection, newProductId);
                    await updateDoc(productRef, { productId: newProductId });
                    console.log(`Updated product document with its own ID in the data`);

                    // Update local state with the new document ID
                    const newProductWithId = { ...productData, productId: newProductId };
                    setProducts(prevProducts => [...prevProducts, newProductWithId]);

                    toast.success('Product added successfully');
                } catch (error) {
                    console.error('Error adding product:', error);
                    toast.error('Failed to add product. Please try again.');
                }
            }

            // Return to list view
            setView('list');

        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(`Failed to ${view === 'edit' ? 'update' : 'add'} product. Please try again.`);
        } finally {
            setUploading(false);
        }
    };

    // Cancel form and return to list view
    const handleCancel = () => {
        setView('list');
        setSelectedProduct(null);
    };

    // Handle product availability toggle
    const handleAvailabilityToggle = async (productId, newInStockStatus) => {
        try {
            setLoading(true);
            console.log(`Toggle availability for product ${productId} to ${newInStockStatus ? 'Available' : 'Unavailable'}`);

            const product = products.find(p => p.productId === productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const businessEmail = businessData.email;
            console.log(`Business email: ${businessEmail}`);

            // Determine current and new subcollections
            const currentSubcollection = product.inStock ? 'Available' : 'Unavailable';
            const newSubcollection = newInStockStatus ? 'Available' : 'Unavailable';
            console.log(`Moving product from ${currentSubcollection} to ${newSubcollection}`);

            if (currentSubcollection === newSubcollection) {
                console.log(`No change in subcollection, just updating inStock status`);
                // No change in subcollection, just update the status
                const productRef = doc(db, 'Products', businessEmail, currentSubcollection, productId);
                await updateDoc(productRef, { inStock: newInStockStatus });
                console.log(`Updated inStock status successfully`);

                // Update local state
                setProducts(prevProducts =>
                    prevProducts.map(p => p.productId === productId ? { ...p, inStock: newInStockStatus } : p)
                );
            } else {
                // Move product between subcollections
                const businessDocRef = doc(db, 'Products', businessEmail);

                // Get current product data
                const productRef = doc(businessDocRef, currentSubcollection, productId);
                const productSnap = await getDoc(productRef);
                if (!productSnap.exists()) {
                    throw new Error('Product document not found');
                }

                // Get product data and update inStock status
                const productData = {
                    ...productSnap.data(),
                    inStock: newInStockStatus,
                    updatedAt: new Date().toISOString(),
                    productId: productId // Ensure productId is included in the data
                };

                // Delete from current subcollection
                await deleteDoc(productRef);
                console.log(`Deleted product from ${currentSubcollection}`);

                // Add to new subcollection with SAME ID to maintain identity
                const newProductRef = doc(businessDocRef, newSubcollection, productId);
                await setDoc(newProductRef, productData);
                console.log(`Added product to ${newSubcollection} with ID: ${productId}`);

                toast.success(`Product moved to ${newInStockStatus ? 'Available' : 'Unavailable'} products`);

                // Refresh products to update UI with a complete fetch
                await fetchProducts();
            }
        } catch (error) {
            console.error('Error toggling product availability:', error);
            toast.error('Failed to update product availability. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Render appropriate view based on state
    const renderView = () => {
        switch (view) {
            case 'add':
                return (
                    <ProductForm
                        onSubmit={saveProduct}
                        onCancel={handleCancel}
                        initialData={null}
                    />
                );

            case 'edit':
                return (
                    <ProductForm
                        onSubmit={saveProduct}
                        onCancel={handleCancel}
                        initialData={selectedProduct}
                    />
                );

            case 'view':
                return (
                    <ProductView
                        product={selectedProduct}
                        onBack={handleCancel}
                        onEdit={() => setView('edit')}
                        onDelete={() => handleDeleteConfirmation(selectedProduct.productId)}
                    />
                );

            case 'list':
            default:
                return (
                    <ProductList
                        products={products}
                        onAdd={handleAddProduct}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteConfirmation}
                        onView={handleViewProduct}
                        onToggleAvailability={handleAvailabilityToggle}
                    />
                );
        }
    };

    return (
        <div className="products-container product-management-theme">
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading products...</p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderView()}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <h3>Delete Product</h3>
                        <p>Are you sure you want to delete this product? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteProduct}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Uploading Overlay */}
            {uploading && (
                <div className="upload-overlay">
                    <div className="upload-modal">
                        <div className="spinner"></div>
                        <p>Uploading product data and images...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
