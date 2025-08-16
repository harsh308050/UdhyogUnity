import React from 'react';
import { Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';

const ProductListItem = ({ product, onEdit, onDelete, onView, onToggleAvailability }) => {
    // Get the first image as display image
    const displayImage = product.images && product.images.length > 0
        ? product.images[0].preview || product.images[0].url
        : 'https://via.placeholder.com/50?text=No+Image';

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    return (
        <div className="product-list-item">
            <div className="list-cell product-image-cell">
                <img src={displayImage} alt={product.name} className="list-product-image" />
            </div>

            <div className="list-cell product-name-cell">
                <div className="product-name">{product.name}</div>
                <div className="product-meta-small">
                    <span className="product-rating-small">{product.rating ? Number(product.rating).toFixed(1) : '—'}</span>
                    <span className="product-reviewcount-small">({product.reviewCount || 0})</span>
                </div>
                <div className="product-tags-small">
                    {product.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="product-tag-small">{tag}</span>
                    ))}
                    {product.tags.length > 2 && (
                        <span className="more-tags-small">+{product.tags.length - 2}</span>
                    )}
                </div>
            </div>

            <div className="list-cell product-category-cell">
                {product.category}
            </div>

            <div className="list-cell product-price-cell">
                {product.discountedPrice ? (
                    <div className="price-container">
                        <div className="list-original-price">{formatPrice(product.price)}</div>
                        <div className="list-discounted-price">{formatPrice(product.discountedPrice)}</div>
                    </div>
                ) : (
                    <div className="list-regular-price">{formatPrice(product.price)}</div>
                )}
            </div>

            <div className="list-cell product-stock-cell">
                <div
                    className={`list-stock-toggle ${product.inStock ? 'list-in-stock' : 'list-out-of-stock'}`}
                    onClick={() => onToggleAvailability(product.productId, !product.inStock)}
                    title={product.inStock ? "Set as unavailable" : "Set as available"}
                >
                    {product.inStock ? (
                        <>
                            <CheckCircle size={14} className="stock-icon" />
                            <span>{product.quantity}</span>
                        </>
                    ) : (
                        <>
                            <XCircle size={14} className="stock-icon" />
                            <span>Out of Stock</span>
                        </>
                    )}
                </div>
            </div>

            <div className="list-cell product-status-cell">
                <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="list-cell product-actions-cell">
                <button
                    className="list-action-button view-button"
                    onClick={onView}
                    title="View Product"
                >
                    <Eye size={16} />
                </button>

                <button
                    className="list-action-button edit-button"
                    onClick={onEdit}
                    title="Edit Product"
                >
                    <Edit size={16} />
                </button>

                <button
                    className="list-action-button delete-button"
                    onClick={onDelete}
                    title="Delete Product"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default ProductListItem;
