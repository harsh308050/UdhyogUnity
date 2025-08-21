import React, { useState, useEffect } from 'react';
import { Heart, X, ExternalLink, ShoppingBag, Star, Tag, CheckCircle, XCircle } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../Firebase/config';
import { collection, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getUserFavorites, removeFromFavorites } from '../../Firebase/favoriteDb';
import { toast } from 'react-toastify';
import { MapPin } from 'react-feather';

function UserFavorites() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('businesses');
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchFavorites = async () => {
            if (!currentUser) return;

            try {
                // Get all favorites using the new schema structure
                const allFavorites = await getUserFavorites(currentUser.email);

                // Extract different types of favorites
                const businessFavorites = allFavorites.businesses || [];
                const productFavorites = allFavorites.products || [];
                const serviceFavorites = allFavorites.services || [];

                // Process business favorites
                const businessPromises = businessFavorites.map(async (favoriteData) => {
                    try {
                        // Get the business details
                        const businessRef = doc(db, "Businesses", favoriteData.itemId);
                        const businessDoc = await getDoc(businessRef);

                        if (businessDoc.exists()) {
                            return {
                                id: favoriteData.id,
                                ...favoriteData,
                                itemDetails: businessDoc.data()
                            };
                        }

                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: { businessName: 'Unknown Business' }
                        };
                    } catch (error) {
                        console.error("Error fetching business details:", error);
                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: { businessName: 'Error loading business' }
                        };
                    }
                });

                // Process product favorites
                const productPromises = productFavorites.map(async (favoriteData) => {
                    try {
                        // Get the product details - first try Available collection
                        if (favoriteData.businessId) {
                            const productRef = doc(db, "Products", favoriteData.businessId, "Available", favoriteData.itemId);
                            const productDoc = await getDoc(productRef);

                            if (productDoc.exists()) {
                                return {
                                    id: favoriteData.id,
                                    ...favoriteData,
                                    itemDetails: productDoc.data()
                                };
                            }

                            // If not found in Available, try Unavailable collection
                            const unavailableProductRef = doc(db, "Products", favoriteData.businessId, "Unavailable", favoriteData.itemId);
                            const unavailableProductDoc = await getDoc(unavailableProductRef);

                            if (unavailableProductDoc.exists()) {
                                return {
                                    id: favoriteData.id,
                                    ...favoriteData,
                                    itemDetails: unavailableProductDoc.data()
                                };
                            }
                        }

                        // If product details not found, return enriched basic info from favoriteData
                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: {
                                name: favoriteData.name || favoriteData.productName || 'Unknown Product',
                                price: favoriteData.price || 0,
                                originalPrice: favoriteData.originalPrice || null,
                                discountedPrice: favoriteData.discountedPrice || null,
                                businessName: favoriteData.businessName || 'Unknown Business',
                                businessId: favoriteData.businessId || '',
                                category: favoriteData.category || '',
                                description: favoriteData.description || '',
                                images: favoriteData.images || [],
                                inStock: favoriteData.inStock !== false,
                                rating: favoriteData.rating || 0,
                                reviewCount: favoriteData.reviewCount || 0,
                                tags: favoriteData.tags || [],
                                createdAt: favoriteData.createdAt || null
                            }
                        };
                    } catch (error) {
                        console.error("Error fetching product details:", error);
                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: {
                                name: favoriteData.name || favoriteData.productName || 'Error loading product',
                                price: favoriteData.price || 0,
                                businessName: favoriteData.businessName || 'Unknown Business',
                                inStock: true,
                                rating: 0,
                                reviewCount: 0,
                                images: favoriteData.images || [],
                                tags: []
                            }
                        };
                    }
                });

                // Process service favorites
                const servicePromises = serviceFavorites.map(async (favoriteData) => {
                    try {
                        // Since we're now storing complete service data in favorites, 
                        // use that as primary source and try to fetch fresh data as enhancement
                        let enhancedDetails = {
                            name: favoriteData.serviceName || favoriteData.name || 'Unknown Service',
                            serviceName: favoriteData.serviceName || favoriteData.name || 'Unknown Service',
                            price: favoriteData.price || 0,
                            duration: favoriteData.duration || 'N/A',
                            businessName: favoriteData.businessName || 'Unknown Business',
                            category: favoriteData.category || '',
                            images: favoriteData.images || [],
                            description: favoriteData.description || '',
                            isActive: favoriteData.isActive !== false
                        };

                        // Try to fetch fresh service details if business email/ID is available
                        const businessEmail = favoriteData.businessEmail || favoriteData.businessId;

                        if (businessEmail) {
                            try {
                                const serviceRef = doc(db, "Services", businessEmail, "Active", favoriteData.itemId);
                                const serviceDoc = await getDoc(serviceRef);

                                if (serviceDoc.exists()) {
                                    enhancedDetails = { ...enhancedDetails, ...serviceDoc.data() };
                                } else {
                                    // Try Inactive collection
                                    const inactiveServiceRef = doc(db, "Services", businessEmail, "Inactive", favoriteData.itemId);
                                    const inactiveServiceDoc = await getDoc(inactiveServiceRef);

                                    if (inactiveServiceDoc.exists()) {
                                        enhancedDetails = { ...enhancedDetails, ...inactiveServiceDoc.data() };
                                    }
                                }
                            } catch (fetchError) {
                                console.log("Could not fetch fresh service data, using stored data:", fetchError);
                            }
                        }

                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: enhancedDetails
                        };
                    } catch (error) {
                        console.error("Error processing service favorite:", error);
                        return {
                            id: favoriteData.id,
                            ...favoriteData,
                            itemDetails: {
                                name: favoriteData.serviceName || favoriteData.name || 'Error loading service',
                                serviceName: favoriteData.serviceName || favoriteData.name || 'Error loading service',
                                price: favoriteData.price || 0,
                                duration: favoriteData.duration || 'N/A',
                                images: []
                            }
                        };
                    }
                });

                // Wait for all the data to be loaded
                const [businessFavoritesWithDetails, productFavoritesWithDetails, serviceFavoritesWithDetails] = await Promise.all([
                    Promise.all(businessPromises),
                    Promise.all(productPromises),
                    Promise.all(servicePromises)
                ]);

                setFavorites({
                    businesses: businessFavoritesWithDetails,
                    products: productFavoritesWithDetails,
                    services: serviceFavoritesWithDetails
                });
            } catch (error) {
                console.error("Error fetching favorites:", error);
                toast.error("Failed to load favorites");
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [currentUser]);

    const handleRemoveFavorite = async (favoriteId, itemId, type) => {
        try {
            // Use the favoriteDb function to remove from favorites
            await removeFromFavorites(currentUser.email, itemId, type);

            // Update state based on which tab is active
            if (activeTab === 'businesses') {
                setFavorites({
                    ...favorites,
                    businesses: favorites.businesses.filter(fav => fav.id !== favoriteId)
                });
                toast.success("Business removed from favorites");
            } else if (activeTab === 'products') {
                setFavorites({
                    ...favorites,
                    products: favorites.products.filter(fav => fav.id !== favoriteId)
                });
                toast.success("Product removed from favorites");
            } else if (activeTab === 'services') {
                setFavorites({
                    ...favorites,
                    services: favorites.services.filter(fav => fav.id !== favoriteId)
                });
                toast.success("Service removed from favorites");
            }
        } catch (error) {
            console.error("Error removing favorite:", error);
            toast.error("Failed to remove from favorites");
        }
    };

    const renderBusinessFavorites = () => {
        if (!favorites.businesses || favorites.businesses.length === 0) {
            return (
                <div className="empty-favorites">
                    <Heart size={48} />
                    <p>You haven't saved any businesses yet.</p>
                    <Link to="/explore-businesses" className="btn-primary">
                        Explore Businesses
                    </Link>
                </div>
            );
        }

        return (
            <div className="favorites-grid">
                {favorites.businesses.map(favorite => (
                    <div key={favorite.id} className="favorite-card business-card">
                        <button
                            className="remove-favorite"
                            onClick={() => handleRemoveFavorite(favorite.id, favorite.itemId, 'business')}
                            title="Remove from favorites"
                        >
                            <X size={18} />
                        </button>

                        <div className="favorite-image">
                            <img
                                src={
                                    favorite.itemDetails.logo?.url ||
                                    favorite.itemDetails.logo ||
                                    favorite.itemDetails.coverImage ||
                                    favorite.logo?.url ||
                                    favorite.logo ||
                                    'https://via.placeholder.com/150x150?text=Business'
                                }
                                alt={favorite.itemDetails.businessName}
                            />
                        </div>

                        <div className="favorite-details">
                            <h3>{favorite.itemDetails.businessName}</h3>
                            <p className="business-type">{favorite.itemDetails.businessType}</p>

                            {favorite.itemDetails.address && (
                                <p className="description">{favorite.itemDetails.description}</p>
                            )}
                            {favorite.itemDetails.address && (
                                <div className="location">
                                    <MapPin size={14} />
                                    <span>{favorite.itemDetails.cityName}, {favorite.itemDetails.stateName}</span>
                                </div>
                            )}

                            <Link to={`/business/${favorite.itemId}`} className=" btn">
                                <span>View Business</span>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderProductFavorites = () => {
        if (!favorites.products || favorites.products.length === 0) {
            return (
                <div className="empty-favorites">
                    <Heart size={48} />
                    <p>You haven't saved any products yet.</p>
                    <Link to="/explore-products" className="btn-primary">
                        Explore Products
                    </Link>
                </div>
            );
        }

        // Helper function to calculate discount percentage
        const calculateDiscount = (originalPrice, currentPrice) => {
            if (originalPrice && originalPrice > currentPrice) {
                return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
            }
            return 0;
        };

        // Helper function to render stars
        const renderStars = (rating) => {
            return Array.from({ length: 5 }, (_, index) => (
                <Star
                    key={index}
                    size={12}
                    fill={index < Math.floor(rating) ? '#FFD700' : 'none'}
                    color={index < Math.floor(rating) ? '#FFD700' : '#ccc'}
                />
            ));
        };

        return (
            <div className="favorites-grid">
                {favorites.products.map(favorite => {
                    const product = favorite.itemDetails;
                    const discountPercentage = calculateDiscount(product.originalPrice || product.price, product.discountedPrice || product.price);

                    return (
                        <div key={favorite.id} className="favorite-card product-card">
                            <button
                                className="remove-favorite"
                                onClick={() => handleRemoveFavorite(favorite.id, favorite.itemId, 'product')}
                                title="Remove from favorites"
                            >
                                <X size={18} />
                            </button>

                            <div className="favorite-image">
                                <img
                                    src={
                                        product.images?.[0]?.url ||
                                        product.images?.[0] ||
                                        favorite.images?.[0]?.url ||
                                        favorite.images?.[0] ||
                                        'https://via.placeholder.com/150x150?text=Product'
                                    }
                                    alt={product.name || favorite.productName || favorite.name}
                                />
                                {discountPercentage > 0 && (
                                    <div className="discount-badge">
                                        {discountPercentage}% OFF
                                    </div>
                                )}
                            </div>

                            <div className="favorite-details">
                                <h3>{product.name || favorite.productName || favorite.name}</h3>

                                {/* Business name */}
                                {(product.businessName || favorite.businessName) && (
                                    <p className="business-name">
                                        Sold by: {product.businessName || favorite.businessName}
                                    </p>
                                )}

                                <br />

                                {/* Product category */}
                                {(product.category || favorite.category) && (
                                    <p className="product-category">
                                        <Tag size={14} />
                                        <span>{product.category || favorite.category}</span>
                                    </p>
                                )}

                                {/* Price section */}
                                <div className="product-price">
                                    <span className="current-price">
                                        ₹{(product.discountedPrice || product.price || favorite.price || 0).toLocaleString()}
                                    </span>
                                    {/* Rating and reviews */}
                                    <div className="product-rating">
                                        <div className="stars">
                                            {renderStars(product.rating || favorite.rating || 0)}
                                        </div>
                                        <span className="rating-text">
                                            ({product.reviewCount || favorite.reviewCount || 0} reviews)
                                        </span>
                                    </div>
                                    {(product.originalPrice || (product.price && product.discountedPrice)) && (
                                        <span className="original-price">
                                            ₹{(product.originalPrice || product.price || 0).toLocaleString()}
                                        </span>
                                    )}
                                </div>



                                {/* Stock status */}
                                <div className="stock-status">
                                    {(product.inStock !== false && favorite.inStock !== false) ? (
                                        <div className="in-stock">
                                            <CheckCircle size={14} />
                                            <span>In Stock</span>
                                        </div>
                                    ) : (
                                        <div className="out-of-stock">
                                            <XCircle size={14} />
                                            <span>Out of Stock</span>
                                        </div>
                                    )}
                                </div>

                                {/* Product tags */}
                                {(product.tags && product.tags.length > 0) && (
                                    <div className="product-tags">
                                        {product.tags.slice(0, 3).map((tag, index) => (
                                            <span key={index} className="product-tag">
                                                {tag}
                                            </span>
                                        ))}
                                        {product.tags.length > 3 && (
                                            <span className="more-tags">
                                                +{product.tags.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderServiceFavorites = () => {
        if (!favorites.services || favorites.services.length === 0) {
            return (
                <div className="empty-favorites">
                    <Heart size={48} />
                    <p>You haven't saved any services yet.</p>
                    <Link to="/explore-services" className="btn-primary">
                        Explore Services
                    </Link>
                </div>
            );
        }

        return (
            <div className="favorites-grid">
                {favorites.services.map(favorite => (
                    <div key={favorite.id} className="favorite-card service-card">
                        <button
                            className="remove-favorite"
                            onClick={() => handleRemoveFavorite(favorite.id, favorite.itemId, 'service')}
                            title="Remove from favorites"
                        >
                            <X size={18} />
                        </button>

                        <div className="favorite-image">
                            <img
                                src={
                                    favorite.itemDetails.images?.[0]?.url ||
                                    favorite.itemDetails.images?.[0] ||
                                    favorite.images?.[0]?.url ||
                                    favorite.images?.[0] ||
                                    'https://via.placeholder.com/150x150?text=Service'
                                }
                                alt={favorite.itemDetails.name || favorite.itemDetails.serviceName || 'Service'}
                            />
                        </div>

                        <div className="favorite-details">
                            <h3>{favorite.itemDetails.name || favorite.itemDetails.serviceName || favorite.serviceName || 'Service'}</h3>

                            <div className="service-info">
                                <div className="service-price">
                                    <span className="current-price">₹{(favorite.itemDetails.price || favorite.price || 0).toFixed(2)}</span>
                                </div>

                                {(favorite.itemDetails.duration || favorite.duration) && (
                                    <div className="service-duration">
                                        Duration: {favorite.itemDetails.duration || favorite.duration} Minutes
                                    </div>
                                )}

                                {(favorite.itemDetails.businessName || favorite.businessName) && (
                                    <div className="service-business">
                                        Business: {favorite.itemDetails.businessName || favorite.businessName}
                                    </div>
                                )}
                            </div>
                            <Link to={`/service/${favorite.itemId}`} className="view-link">
                                <span>View Service</span>
                                <ExternalLink size={16} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="user-favorites">
            <h2>My Favorites</h2>

            <div className="favorites-tabs">
                <button
                    className={`favorites-tab ${activeTab === 'businesses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('businesses')}
                >
                    Saved Businesses
                </button>
                <button
                    className={`favorites-tab ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Saved Products
                </button>
                <button
                    className={`favorites-tab ${activeTab === 'services' ? 'active' : ''}`}
                    onClick={() => setActiveTab('services')}
                >
                    Saved Services
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your favorites...</p>
                </div>
            ) : (
                <div className="favorites-content">
                    {activeTab === 'businesses' && renderBusinessFavorites()}
                    {activeTab === 'products' && renderProductFavorites()}
                    {activeTab === 'services' && renderServiceFavorites()}
                </div>
            )}
        </div>
    );
}

export default UserFavorites;
