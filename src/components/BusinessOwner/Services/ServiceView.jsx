import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Tag, CheckCircle, XCircle, Calendar, Clock, ExternalLink, X, Users } from 'lucide-react';
import './ServiceView.css';

const ServiceView = ({ service, onBack, onEdit }) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    // Format date to readable format
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        // Handle Firestore Timestamp objects
        if (dateString.toDate && typeof dateString.toDate === 'function') {
            dateString = dateString.toDate();
        }

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-IN', options);
    };

    // Format duration
    const formatDuration = (duration) => {
        if (!duration) return 'N/A';
        if (duration < 60) return `${duration} min`;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    };

    // Calculate discount percentage if discounted price exists
    const calculateDiscount = () => {
        if (service.discountedPrice && service.price) {
            const discount = ((service.price - service.discountedPrice) / service.price) * 100;
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
            className="flipkart-product-view service-view"
        >
            <div className="product-view-header">
                <button className="btn btn-primary" onClick={onBack}>
                    <ArrowLeft size={16} className="me-2" />
                    Back to Services
                </button>

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
                        <div className="main-image-container">
                            {service.images && service.images.length > 0 ? (
                                <img
                                    src={service.images[selectedImageIndex].url || service.images[selectedImageIndex].preview}
                                    alt={service.name}
                                    className="main-product-image"
                                    onClick={() => setFullscreenImage(service.images[selectedImageIndex].url || service.images[selectedImageIndex].preview)}
                                />
                            ) : (
                                <div className="no-image-placeholder">
                                    <span>No Image Available</span>
                                </div>
                            )}

                            {discountPercentage && (
                                <div className="discount-badge">-{discountPercentage}%</div>
                            )}
                        </div>

                        {service.images && service.images.length > 1 && (
                            <div className="product-thumbnails">
                                {service.images.map((image, index) => (
                                    <div
                                        key={image.id || index}
                                        className={`thumbnail-container ${index === selectedImageIndex ? 'active' : ''}`}
                                        onClick={() => setSelectedImageIndex(index)}
                                    >
                                        <img
                                            src={image.url || image.preview}
                                            alt={`${service.name} - ${index + 1}`}
                                            className="product-thumbnail"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Service Details */}
                    <div className="product-details-container">
                        <div className="product-title-section">
                            <h1 className="product-title">{service.name}</h1>

                            {service.category && (
                                <div className="product-category-tag">
                                    <Tag size={16} className="me-1" />
                                    <span>{service.category}</span>
                                </div>
                            )}

                            <div className={`status-indicator-large ${service.isActive ? 'active' : 'inactive'}`}>
                                {service.isActive ? (
                                    <>
                                        <CheckCircle size={16} className="me-1" />
                                        <span>Active</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={16} className="me-1" />
                                        <span>Inactive</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="product-pricing-section">
                            {service.discountedPrice ? (
                                <div className="pricing-row">
                                    <div className="discounted-price-view">{formatPrice(service.discountedPrice)}</div>
                                    <div className="original-price-view">{formatPrice(service.price)}</div>
                                    {discountPercentage && (
                                        <div className="discount-percentage">{discountPercentage}% off</div>
                                    )}
                                </div>
                            ) : (
                                <div className="regular-price-view">{formatPrice(service.price)}</div>
                            )}

                            <div className="tax-info">Inclusive of all taxes</div>
                        </div>

                        <div className="product-highlights">
                            <div className="highlight-row">
                                <div className="highlight-label">Duration</div>
                                <div className="highlight-value">
                                    <div className="status-indicator">
                                        <Clock size={16} className="me-1" />
                                        <span>{formatDuration(service.duration)}</span>
                                    </div>
                                </div>
                            </div>

                            {service.capacity && (
                                <div className="highlight-row">
                                    <div className="highlight-label">Capacity</div>
                                    <div className="highlight-value">
                                        <div className="status-indicator">
                                            <Users size={16} className="me-1" />
                                            <span>{service.capacity} people per session</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="highlight-row">
                                <div className="highlight-label">Availability</div>
                                <div className="highlight-value">
                                    <div className={`status-indicator ${service.isActive ? 'in-stock' : 'out-of-stock'}`}>
                                        {service.isActive ? (
                                            <>
                                                <CheckCircle size={16} className="me-1" />
                                                <span>Available for booking</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} className="me-1" />
                                                <span>Not available for booking</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {service.tags && service.tags.length > 0 && (
                                <div className="highlight-row">
                                    <div className="highlight-label">Tags</div>
                                    <div className="highlight-value">
                                        <div className="tags-container-view">
                                            {service.tags.map(tag => (
                                                <span key={tag} className="tag-badge-view">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {service.description && (
                            <div className="product-description">
                                <h3>Description</h3>
                                <p className="description-text">{service.description}</p>
                            </div>
                        )}

                        <div className="product-metadata">
                            <div className="metadata-item">
                                <Calendar size={14} className="me-1" />
                                <span>Created: {formatDate(service.createdAt)}</span>
                            </div>

                            <div className="metadata-item">
                                <Clock size={14} className="me-1" />
                                <span>Last Updated: {formatDate(service.updatedAt)}</span>
                            </div>

                            <div className="metadata-item">
                                <span className="product-id">Service ID: {service.id}</span>
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

export default ServiceView;
