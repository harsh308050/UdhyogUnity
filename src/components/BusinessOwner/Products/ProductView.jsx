import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Trash2, Tag, CheckCircle, XCircle, Calendar, Clock, Package, Truck, Store, Award, X, ExternalLink, Star } from 'lucide-react';
import './ProductView.css';

const ProductView = ({ product, onBack, onEdit, onDelete }) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    // Format date to readable format
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    };

    // Calculate discount percentage if discounted price exists
    const calculateDiscount = () => {
        if (product.discountedPrice && product.price) {
            const discount = ((product.price - product.discountedPrice) / product.price) * 100;
            return Math.round(discount);
        }
        return null;
    };

    const discountPercentage = calculateDiscount();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flipkart-product-view"
        >
            <div className="product-view-header">
                <div className="product-actions">
                    <button className="btn" onClick={onBack}>
                        <ArrowLeft size={16} className="me-1" />
                        Back
                    </button>
                </div>

                <div className="product-actions">
                    <button className="btn btn-outline-primary me-2" onClick={onEdit}>
                        <Edit size={16} className="me-1" />
                        Edit
                    </button>
                </div>
            </div>

            <div className="product-view-content">
                <div className="product-view-main">
                    {/* Left Column - Image Gallery */}
                    <div className="product-gallery">
                        {product.images && product.images.length > 0 ? (
                            <img
                                src={product.images[selectedImageIndex].url || product.images[selectedImageIndex].preview}
                                alt={product.name}
                                className="main-product-image"
                                onClick={() => setFullscreenImage(product.images[selectedImageIndex].url || product.images[selectedImageIndex].preview)}
                            />
                        ) : (
                            <div className="no-image-placeholder">
                                <Package size={64} />
                                <span>No Image Available</span>
                            </div>
                        )}

                        {discountPercentage && (
                            <div className="discount-badge">-{discountPercentage}%</div>
                        )}

                        {product.images && product.images.length > 1 && (
                            <div className="product-thumbnails">
                                {product.images.map((image, index) => (
                                    <div
                                        key={image.id || index}
                                        className={`thumbnail-container ${index === selectedImageIndex ? 'active' : ''}`}
                                        onClick={() => setSelectedImageIndex(index)}
                                    >
                                        <img
                                            src={image.url || image.preview}
                                            alt={`${product.name} - ${index + 1}`}
                                            className="product-thumbnail"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}


                    </div>

                    {/* Right Column - Product Details */}
                    <div className="product-details-container">
                        <div className="product-title-section">
                            <h1 className="product-title">{product.name}</h1>

                            <div className="product-category-tag">
                                <Tag size={16} className="me-1" />
                                <span>{product.category}</span>
                            </div>

                            <div className="product-rating">
                                <div className="rating-badge">
                                    <span>{product.rating ? Number(product.rating).toFixed(1) : '—'}</span>
                                    <Star size={12} fill="#ffffff" />
                                </div>
                                <span className="rating-count">({product.reviewCount || 0} Reviews)</span>
                            </div>

                            {product.isActive && (
                                <div className="assured-badge">
                                    <Award size={16} className="me-1" />
                                    <span>UdhyogUnity Assured</span>
                                </div>
                            )}
                        </div>

                        <div className="product-pricing-section">
                            {product.discountedPrice ? (
                                <div className="pricing-row">
                                    <div className="discounted-price-view">{formatPrice(product.discountedPrice)}</div>
                                    <div className="original-price-view">{formatPrice(product.price)}</div>
                                    {discountPercentage && (
                                        <div className="discount-percentage">{discountPercentage}% off</div>
                                    )}
                                </div>
                            ) : (
                                <div className="regular-price-view">{formatPrice(product.price)}</div>
                            )}

                            <div className="tax-info">Inclusive of all taxes</div>
                        </div>



                        <div className="product-highlights">
                            <div className="highlight-row">
                                <div className="highlight-label">Availability</div>
                                <div className="highlight-value">
                                    <div className={`status-indicator ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
                                        {product.inStock ? (
                                            <>
                                                <CheckCircle size={16} className="me-1" />
                                                <span>In Stock ({product.quantity} available)</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} className="me-1" />
                                                <span>Out of Stock</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="highlight-row">
                                <div className="highlight-label">Delivery</div>
                                <div className="highlight-value">
                                    <div className="delivery-options">
                                        {product.availableForPickup && (
                                            <div className="delivery-option available">
                                                <Store size={16} className="me-1" />
                                                <span>Store Pickup Available</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {product.tags && product.tags.length > 0 && (
                                <div className="highlight-row">
                                    <div className="highlight-label">Tags</div>
                                    <div className="highlight-value">
                                        <div className="tags-container-view">
                                            {product.tags.map(tag => (
                                                <span key={tag} className="tag-badge-view">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="product-description">
                            <h3>Description</h3>
                            <p className="description-text">{product.description}</p>
                        </div>

                        <div className="product-metadata">
                            <div className="metadata-item">
                                <Calendar size={14} className="me-1" />
                                <span>Created: {formatDate(product.createdAt)}</span>
                            </div>

                            <div className="metadata-item">
                                <Clock size={14} className="me-1" />
                                <span>Last Updated: {formatDate(product.updatedAt)}</span>
                            </div>

                            <div className="metadata-item">
                                <span className="product-id">Product ID: {product.productId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Image Modal */}
            {fullscreenImage && (
                <div className="fullscreen-image-modal" onClick={() => setFullscreenImage(null)}>
                    <div className="fullscreen-image-content" onClick={(e) => e.stopPropagation()}>
                        <button className="fullscreen-close-btn" onClick={() => setFullscreenImage(null)}>
                            <X size={24} />
                        </button>
                        <img src={fullscreenImage} alt="Full size" />
                        <a
                            href={fullscreenImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="open-in-new-tab-btn"
                        >
                            <ExternalLink size={20} />
                            <span>Open in New Tab</span>
                        </a>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ProductView;
