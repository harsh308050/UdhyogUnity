import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, Eye, Tag, CheckCircle, XCircle, ToggleRight } from 'lucide-react';

const ProductCard = ({ product, onEdit, onDelete, onView, onToggleAvailability }) => {
    // Get the first image as main display image
    const displayImage = product.images && product.images.length > 0
        ? product.images[0].preview || product.images[0].url
        : 'https://via.placeholder.com/300x200?text=No+Image';

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
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
            className="product-card"
            whileHover={{
                y: -10,
                boxShadow: '0 15px 30px rgba(0,0,0,0.2)',
                borderColor: '#3563bf'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                type: "spring",
                stiffness: 300
            }}
        >
            <div className="product-image-container">
                <motion.img
                    src={displayImage}
                    alt={product.name}
                    className="product-image"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                />
                {discountPercentage && (
                    <motion.div
                        className="discount-badge"
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{
                            delay: 0.3,
                            type: "spring",
                            stiffness: 300
                        }}
                    >
                        -{discountPercentage}%
                    </motion.div>
                )}
                {!product.isActive && (
                    <motion.div
                        className="inactive-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span>Inactive</span>
                    </motion.div>
                )}
            </div>

            <div className="product-details">
                <h3 className="product-name">{product.name}</h3>

                <div className="product-category">
                    <Tag size={14} className="category-icon" />
                    <span>{product.category}</span>
                </div>

                <div className="product-price">
                    {product.discountedPrice ? (
                        <>
                            <span className="original-price">{formatPrice(product.price)}</span>
                            <motion.span
                                className="discounted-price"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {formatPrice(product.discountedPrice)}
                            </motion.span>
                        </>
                    ) : (
                        <motion.span
                            className="regular-price"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {formatPrice(product.price)}
                        </motion.span>
                    )}
                </div>

                <div
                    className="product-stock"
                    onClick={() => onToggleAvailability(product.productId, !product.inStock)}
                    title={product.inStock ? "Set as unavailable" : "Set as available"}
                    style={{ cursor: 'pointer' }}
                >
                    <motion.div
                        className={product.inStock ? "in-stock" : "out-of-stock"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <ToggleRight size={16} className="toggle-icon me-1" />
                        {product.inStock ? (
                            <>
                                <CheckCircle size={14} className="stock-icon" />
                                <span>In Stock ({product.quantity})</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={14} className="stock-icon" />
                                <span>Out of Stock</span>
                            </>
                        )}
                    </motion.div>
                </div>

                <motion.div
                    className="product-tags"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {product.tags.slice(0, 3).map((tag, index) => (
                        <motion.span
                            key={tag}
                            className="product-tag"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (index * 0.1) }}
                        >
                            {tag}
                        </motion.span>
                    ))}
                    {product.tags.length > 3 && (
                        <motion.span
                            className="more-tags"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                        >
                            +{product.tags.length - 3}
                        </motion.span>
                    )}
                </motion.div>
            </div>

            <div className="product-actions">
                <motion.button
                    className="action-button view-button"
                    onClick={onView}
                    title="View Product"
                    whileHover={{ scale: 1.2, backgroundColor: 'rgba(33, 150, 243, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Eye size={16} />
                </motion.button>

                <motion.button
                    className="action-button edit-button"
                    onClick={onEdit}
                    title="Edit Product"
                    whileHover={{ scale: 1.2, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Edit size={16} />
                </motion.button>

                <motion.button
                    className="action-button delete-button"
                    onClick={onDelete}
                    title="Delete Product"
                    whileHover={{ scale: 1.2, backgroundColor: 'rgba(244, 67, 54, 0.1)' }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Trash2 size={16} />
                </motion.button>
            </div>
        </motion.div>
    );
};

export default ProductCard;
