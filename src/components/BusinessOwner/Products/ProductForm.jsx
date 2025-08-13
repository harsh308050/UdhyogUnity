import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Plus, Tag, Calendar, Maximize2, XCircle } from 'lucide-react';
import { nanoid } from 'nanoid';

const ProductForm = ({ initialData = null, onSubmit, onCancel }) => {
    const defaultFormData = {
        productId: initialData?.productId || nanoid(10),
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || '',
        discountedPrice: initialData?.discountedPrice || '',
        category: initialData?.category || '',
        tags: initialData?.tags || [],
        quantity: initialData?.quantity || 1,
        images: initialData?.images || [],
        availableForDelivery: initialData?.availableForDelivery ?? true,
        availableForPickup: initialData?.availableForPickup ?? true,
        inStock: initialData?.inStock ?? true,
        isActive: initialData?.isActive ?? true,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const [formData, setFormData] = useState(defaultFormData);
    const [errors, setErrors] = useState({});
    const [tagInput, setTagInput] = useState('');
    const [uploadProgress, setUploadProgress] = useState({});
    const [imagePreview, setImagePreview] = useState(formData.images);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        // Only allow numbers and decimals for price fields
        if (name === 'price' || name === 'discountedPrice') {
            const regex = /^\d*\.?\d{0,2}$/;
            if (value === '' || regex.test(value)) {
                setFormData({
                    ...formData,
                    [name]: value
                });
            }
        } else if (name === 'quantity') {
            // Only allow integers for quantity
            const regex = /^\d+$/;
            if (value === '' || regex.test(value)) {
                setFormData({
                    ...formData,
                    [name]: value
                });
            }
        }
    };

    const handleTagInputChange = (e) => {
        setTagInput(e.target.value);
    };

    const addTag = () => {
        if (tagInput.trim() !== '' && !formData.tags.includes(tagInput.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, tagInput.trim()]
            });
            setTagInput('');
        }
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        });
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const newImages = [...formData.images];

            acceptedFiles.forEach(file => {
                const reader = new FileReader();

                reader.onload = () => {
                    newImages.push({
                        id: nanoid(8),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        preview: reader.result,
                        file: file
                    });

                    setFormData(prevData => ({
                        ...prevData,
                        images: newImages
                    }));

                    setImagePreview(newImages);
                };

                reader.readAsDataURL(file);
            });
        }
    }, [formData.images]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/webp': []
        },
        maxFiles: 5
    });

    const removeImage = (imageId) => {
        const updatedImages = formData.images.filter(image => image.id !== imageId);
        setFormData({
            ...formData,
            images: updatedImages
        });
        setImagePreview(updatedImages);
    };

    const handleImageClick = (image) => {
        setFullScreenImage(image);
    };

    const closeFullScreenImage = () => {
        setFullScreenImage(null);
    };

    // Add ESC key listener to close fullscreen image
    React.useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && fullScreenImage) {
                closeFullScreenImage();
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => {
            window.removeEventListener('keydown', handleEscKey);
        };
    }, [fullScreenImage]);

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Product description is required';
        } else if (formData.description.length < 20) {
            newErrors.description = 'Description must be at least 20 characters';
        }

        if (!formData.price) {
            newErrors.price = 'Price is required';
        } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Price must be a positive number';
        }

        if (formData.discountedPrice &&
            (isNaN(parseFloat(formData.discountedPrice)) ||
                parseFloat(formData.discountedPrice) <= 0 ||
                parseFloat(formData.discountedPrice) >= parseFloat(formData.price))) {
            newErrors.discountedPrice = 'Discounted price must be less than the regular price';
        }

        if (!formData.category) {
            newErrors.category = 'Please select a category';
        }

        if (formData.images.length === 0) {
            newErrors.images = 'Please upload at least one product image';
        }

        if (!formData.quantity || formData.quantity <= 0) {
            newErrors.quantity = 'Quantity must be at least 1';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            // Submit the form
            onSubmit(formData);
        }
    };

    // Define product categories based on the business type
    const categoryOptions = [
        'Electronics', 'Fashion', 'Home Decor', 'Food & Beverages', 'Beauty & Personal Care',
        'Health & Wellness', 'Education & Training', 'Professional Services', 'Arts & Crafts',
        'Sports & Fitness', 'Travel & Tourism', 'Entertainment', 'Automotive', 'Real Estate'
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="product-form-container"
        >
            <h2 className="form-title">{initialData ? 'Edit Product' : 'Add New Product'}</h2>

            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-section">
                    <h3 className="section-title">Basic Information</h3>

                    <div className="form-group">
                        <label htmlFor="name" className="form-label">Product Name*</label>
                        <input
                            type="text"
                            className="form-control"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                        />
                        {errors.name && <div className="error-message">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">Product Description*</label>
                        <textarea
                            className="form-control description-textarea"
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Describe your product in detail (minimum 20 characters)"
                        ></textarea>
                        {errors.description && <div className="error-message">{errors.description}</div>}
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="price" className="form-label">Regular Price (₹)*</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleNumberChange}
                                    placeholder="Enter price"
                                />
                                {errors.price && <div className="error-message">{errors.price}</div>}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="discountedPrice" className="form-label">Sale Price (₹)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="discountedPrice"
                                    name="discountedPrice"
                                    value={formData.discountedPrice}
                                    onChange={handleNumberChange}
                                    placeholder="Enter discounted price (optional)"
                                />
                                {errors.discountedPrice && <div className="error-message">{errors.discountedPrice}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="category" className="form-label">Category*</label>
                                <select
                                    className="form-select"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    <option value="">Select a category</option>
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                {errors.category && <div className="error-message">{errors.category}</div>}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="quantity" className="form-label">Quantity*</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleNumberChange}
                                    placeholder="Enter quantity"
                                />
                                {errors.quantity && <div className="error-message">{errors.quantity}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tags</label>
                        <div className="tag-input-container">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    value={tagInput}
                                    onChange={handleTagInputChange}
                                    onKeyDown={handleTagInputKeyDown}
                                    placeholder="Add tags (press Enter)"
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={addTag}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="tags-container mt-2">
                                {formData.tags.map(tag => (
                                    <span key={tag} className="tag-badge">
                                        <Tag size={14} className="me-1" />
                                        {tag}
                                        <button
                                            type="button"
                                            className="tag-remove-btn"
                                            onClick={() => removeTag(tag)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Product Images</h3>

                    <div className="form-group">
                        <div {...getRootProps()} className="dropzone product-images-dropzone">
                            <input {...getInputProps()} />
                            <div className="text-center">
                                <Upload size={32} className="mb-2" />
                                <p>Drop product images here or click to upload</p>
                                <p className="text-muted small">PNG, JPG or WebP (Max 5 images, 2MB each)</p>
                            </div>
                        </div>
                        {errors.images && <div className="error-message">{errors.images}</div>}

                        {imagePreview && imagePreview.length > 0 && (
                            <div className="image-preview-container">
                                {imagePreview.map(image => (
                                    <div key={image.id} className="image-preview-item">
                                        <img
                                            src={image.url || image.preview}
                                            alt={image.name || 'Product image'}
                                            onClick={() => handleImageClick(image)}
                                        />
                                        <button
                                            type="button"
                                            className="image-remove-btn"
                                            onClick={() => removeImage(image.id)}
                                        >
                                            <X size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="image-fullscreen-btn"
                                            onClick={() => handleImageClick(image)}
                                        >
                                            <Maximize2 size={14} />
                                        </button>
                                        {uploadProgress[image.id] !== undefined && uploadProgress[image.id] < 100 && (
                                            <div className="upload-progress">
                                                <div
                                                    className="upload-progress-bar"
                                                    style={{ width: `${uploadProgress[image.id]}%` }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Availability Settings</h3>

                    <div className="form-group">
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="inStock"
                                name="inStock"
                                checked={formData.inStock}
                                onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="inStock">
                                Product is in stock
                            </label>
                        </div>
                    </div>


                    <div className="form-group">
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="availableForPickup"
                                name="availableForPickup"
                                checked={formData.availableForPickup}
                                onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor="availableForPickup">
                                Available for in-store pickup
                            </label>
                        </div>
                    </div>
                </div>

                <div className="form-buttons">
                    <button type="button" className="btn btn-primary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        {initialData ? 'Update Product' : 'Add Product'}
                    </button>
                </div>
            </form>

            {/* Full-screen image preview */}
            {fullScreenImage && (
                <div className="fullscreen-overlay" onClick={closeFullScreenImage}>
                    <div className="fullscreen-image-container">
                        <img
                            src={fullScreenImage.url || fullScreenImage.preview}
                            alt={fullScreenImage.name || "Product image"}
                            className="fullscreen-image"
                        />
                        <button className="close-fullscreen-btn" onClick={closeFullScreenImage}>
                            <XCircle size={32} />
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ProductForm;
