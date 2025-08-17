import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Star, Heart, ShoppingBag, Package, Calendar, Zap, MessageSquare } from 'react-feather';
import './UserExplore.css';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ProductQuickView from './ProductQuickView';
import ServiceBookingModal from './ServiceBookingModal';
import { getAllBusinesses, getAllProducts, getAllServices, searchAll } from '../../Firebase/exploreDb';
import { addToFavorites, removeFromFavorites, checkIfFavorite, getUserFavorites } from '../../Firebase/favoriteDb';
import { startConversationWithBusiness } from '../../Firebase/messageDb';
import ContactBusinessButton from '../miniComponents/ContactBusinessButton';

function UserExplore() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [businesses, setBusinesses] = useState([]);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('businesses');
    const [sortBy, setSortBy] = useState('featured');
    const [favorites, setFavorites] = useState(new Set());
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [serviceToBook, setServiceToBook] = useState(null);

    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        if (currentUser) {
            loadUserFavorites();
        }
    }, [selectedCategory, activeTab, currentUser]);

    useEffect(() => {
        // Handle search with debouncing
        const timer = setTimeout(() => {
            if (searchTerm.trim() !== '') {
                handleSearch();
            } else {
                fetchData();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadUserFavorites = async () => {
        if (!currentUser) return;

        try {
            console.log(`🔄 Loading existing favorites for user: ${currentUser.email}`);

            // Get all user favorites from Firebase
            const allFavorites = await getUserFavorites(currentUser.email);
            const userFavorites = new Set();

            // Add business favorites to the set
            if (allFavorites.businesses) {
                allFavorites.businesses.forEach(fav => {
                    userFavorites.add(`business_${fav.itemId}`);
                });
            }

            // Add product favorites to the set
            if (allFavorites.products) {
                allFavorites.products.forEach(fav => {
                    userFavorites.add(`product_${fav.itemId}`);
                });
            }

            // Add service favorites to the set
            if (allFavorites.services) {
                allFavorites.services.forEach(fav => {
                    userFavorites.add(`service_${fav.itemId}`);
                });
            }

            console.log(`✅ Loaded ${userFavorites.size} existing favorites:`, Array.from(userFavorites));
            setFavorites(userFavorites);
        } catch (error) {
            console.error("Error loading favorites:", error);
            // Fallback to empty set if there's an error
            setFavorites(new Set());
        }
    };

    const handleSearch = async () => {
        if (searchTerm.trim() === '') {
            fetchData();
            return;
        }

        setLoading(true);
        try {
            const searchResults = await searchAll(searchTerm, selectedCategory);
            setBusinesses(searchResults.businesses || []);
            setProducts(searchResults.products || []);
            setServices(searchResults.services || []);
        } catch (error) {
            console.error("Error searching:", error);
        }
        setLoading(false);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'businesses') {
                await fetchBusinesses();
            } else if (activeTab === 'products') {
                await fetchProducts();
            } else if (activeTab === 'services') {
                await fetchServices();
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    const fetchBusinesses = async () => {
        try {
            const businessList = await getAllBusinesses(selectedCategory, 20);
            setBusinesses(businessList);
            console.log(`Loaded ${businessList.length} businesses from Firebase`);
        } catch (error) {
            console.error("Error fetching businesses:", error);
            setBusinesses([]);
        }
    };

    const fetchProducts = async () => {
        try {
            const productList = await getAllProducts(selectedCategory, 30);
            setProducts(productList);
            console.log(`Loaded ${productList.length} products from Firebase`);
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        }
    };

    const fetchServices = async () => {
        try {
            const serviceList = await getAllServices(selectedCategory, 30);
            setServices(serviceList);
            console.log(`Loaded ${serviceList.length} services from Firebase`);
        } catch (error) {
            console.error("Error fetching services:", error);
            setServices([]);
        }
    };

    const handleFavoriteToggle = async (item, type) => {
        if (!currentUser) {
            alert('Please login to add favorites');
            return;
        }

        try {
            const itemId = item.id || item.businessId || item.productId || item.serviceId;
            const favoriteKey = `${type}_${itemId}`;

            console.log(`🔄 Toggling favorite for ${type}:`, {
                itemId,
                favoriteKey,
                item: {
                    id: item.id,
                    businessName: item.businessName,
                    name: item.name,
                    email: item.email
                }
            });

            if (favorites.has(favoriteKey)) {
                console.log(`❌ Removing ${type} from favorites`);
                await removeFromFavorites(currentUser.email, itemId, type);
                setFavorites(prev => {
                    const newFavorites = new Set(prev);
                    newFavorites.delete(favoriteKey);
                    return newFavorites;
                });
            } else {
                console.log(`✅ Adding ${type} to favorites`);

                // Create type-specific data for favorites
                let favoriteData = {
                    name: item.businessName || item.name,
                    imageUrl: getImageUrl(item)
                };

                // Add type-specific fields
                if (type === 'business') {
                    favoriteData = {
                        ...favoriteData,
                        businessName: item.businessName || item.name,
                        businessType: item.businessType || '',
                        description: item.description || item.businessDescription || '',
                        location: item.address ? `${item.address.city}, ${item.address.state}` : '',
                        address: item.address || {},
                        rating: item.rating || 4.0,
                        reviewCount: item.reviewCount || 0,
                        category: item.businessType || item.category || '',
                        logo: item.logo || '',
                        isVerified: item.isVerified || false,
                        email: item.email || '',
                        phoneNumber: item.phoneNumber || '',
                        city: item.city || item.cityName || '',
                        state: item.state || item.stateName || ''
                    };

                    console.log(`📊 Business favorite data prepared:`, favoriteData);
                } else if (type === 'product') {
                    favoriteData = {
                        ...favoriteData,
                        name: item.name || item.productName,
                        productName: item.name || item.productName,
                        description: item.description || '',
                        price: item.price || 0,
                        originalPrice: item.originalPrice || null,
                        businessId: item.businessId || item.businessEmail || '',
                        businessName: item.businessName || '',
                        category: item.category || '',
                        images: item.images || [],
                        inStock: item.inStock !== false,
                        rating: item.rating || 4.0,
                        reviewCount: item.reviewCount || 0,
                        createdAt: item.createdAt || new Date().toISOString()
                    };
                } else if (type === 'service') {
                    favoriteData = {
                        ...favoriteData,
                        name: item.name || item.serviceName,
                        serviceName: item.name || item.serviceName,
                        description: item.description || '',
                        price: item.price || 0,
                        businessEmail: item.businessEmail || '',
                        businessId: item.businessId || '',
                        businessName: item.businessName || '',
                        duration: item.duration || '',
                        category: item.category || '',
                        images: item.images || [],
                        isActive: item.isActive !== false,
                        rating: item.rating || 4.0,
                        reviewCount: item.reviewCount || 0,
                        createdAt: item.createdAt || new Date().toISOString()
                    };
                }

                console.log(`📤 Calling addToFavorites with:`, {
                    userEmail: currentUser.email,
                    itemId,
                    type,
                    favoriteDataKeys: Object.keys(favoriteData)
                });

                const result = await addToFavorites(currentUser.email, itemId, type, favoriteData);
                console.log(`✅ addToFavorites result:`, result);

                setFavorites(prev => new Set([...prev, favoriteKey]));
                console.log(`✅ ${type} successfully added to favorites`);
            }
        } catch (error) {
            console.error(`❌ Error toggling favorite for ${type}:`, error);
            alert(`Failed to ${favorites.has(`${type}_${item.id}`) ? 'remove from' : 'add to'} favorites. Please try again.`);
        }
    };

    const getImageUrl = (item) => {
        if (item.logo) {
            return typeof item.logo === 'string' ? item.logo : item.logo.url;
        }
        if (item.images && item.images.length > 0) {
            return typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url;
        }
        return 'https://via.placeholder.com/150x150?text=No+Image';
    };

    const filteredBusinesses = searchTerm ? businesses.filter(business =>
        business.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : businesses;

    const filteredProducts = searchTerm ? products.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : products;

    const filteredServices = searchTerm ? services.filter(service =>
        service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : services;

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                size={14}
                fill={index < Math.floor(rating) ? '#FFD700' : 'none'}
                color={index < Math.floor(rating) ? '#FFD700' : '#ccc'}
            />
        ));
    };

    const renderBusinessCard = (business) => (
        <div key={business.id} className="explore-card business-card">
            <div className="card-image">
                <img
                    src={getImageUrl(business)}
                    alt={business.businessName}
                />
                {business.isVerified && (
                    <div className="verified-badge">
                        ✓ Verified
                    </div>
                )}
            </div>

            <div className="card-content">
                <h3>{business.businessName}</h3>
                <p className="business-type">{business.businessType}</p>
                <p className="description">{business.description}</p>

                {business.address && (
                    <div className="location">
                        <MapPin size={14} />
                        <span>{business.address.city}, {business.address.state}</span>
                    </div>
                )}

                {/* <div className="rating">
                    <div className="stars">
                        {renderStars(business.rating || 0)}
                    </div>
                    <span className="rating-text">
                        ({business.reviewCount || 0} reviews)
                    </span>
                </div> */}

                <div className="card-actions">
                    <Link to={`/business/${business.id}`} className="btn-view">
                        View Details
                    </Link>
                    <ContactBusinessButton
                        businessEmail={business.email || business.id}
                        businessName={business.businessName}
                        initialMessage={`Hello! ${business.businessName}.`}
                        // buttonText="Contact"
                        // style={{ fontSize: '12px', padding: '8px 12px' }}
                        onSuccess={() => {
                            // Give Firebase time to process the write, then navigate to messages
                            setTimeout(() => {
                                alert(`Started conversation with ${business.businessName}! Check your messages.`);
                                // Optional: Auto-navigate to messages page
                                // window.location.href = '/messages';
                            }, 1500);
                        }}
                    />
                    <button
                        className={`btn-favorite ${favorites.has(`business_${business.id}`) ? 'active' : ''}`}
                        onClick={() => handleFavoriteToggle(business, 'business')}
                    >
                        <Heart size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProductCard = (product) => (
        <div key={product.id} className="explore-card product-card">
            <div className="card-image">
                <img
                    src={getImageUrl(product)}
                    alt={product.name}
                />
                {product.originalPrice && product.originalPrice > product.price && (
                    <div className="discount-badge">
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </div>
                )}
            </div>

            <div className="card-content">
                <h3>{product.name}</h3>
                <p className="business-name">{product.businessName}</p>

                <div className="price">
                    <span className="current-price">₹{product.price?.toLocaleString()}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                        <span className="original-price">₹{product.originalPrice?.toLocaleString()}</span>
                    )}
                </div>

                <div className="rating">
                    <div className="stars">
                        {renderStars(product.rating || 0)}
                    </div>
                    <span className="rating-text">
                        ({product.reviewCount || 0} reviews)
                    </span>
                </div>

                <div className="card-actions">
                    <button
                        className="btn-view"
                        onClick={() => setQuickViewProduct(product)}
                    >
                        View Product
                    </button>
                    <button
                        className={`btn-favorite ${favorites.has(`product_${product.id}`) ? 'active' : ''}`}
                        onClick={() => handleFavoriteToggle(product, 'product')}
                    >
                        <Heart size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderServiceCard = (service) => {
        console.log("Service data in UserExplore:", service);
        return (
            <div key={service.id} className="explore-card service-card">
                <div className="card-image">
                    <img
                        src={getImageUrl(service)}
                        alt={service.name}
                    />
                    <div className="service-badge">
                        Service
                    </div>
                </div>

                <div className="card-content">
                    <h3>{service.name}</h3>
                    <p className="business-name">{service.businessName}</p>
                    <p className="description">{service.description}</p>

                    <div className="service-details">
                        <div className="price">
                            <span className="current-price">₹{service.price?.toLocaleString()}</span>
                        </div>
                        {service.duration && (
                            <div className="duration">
                                <Calendar size={14} />
                                <span>{service.duration} min</span>
                            </div>
                        )}
                    </div>

                    <div className="rating">
                        <div className="stars">
                            {renderStars(service.rating || 0)}
                        </div>
                        <span className="rating-text">
                            ({service.reviewCount || 0} reviews)
                        </span>
                    </div>

                    <div className="card-actions">
                        <button
                            className="btn-view"
                            onClick={() => {
                                console.log("Opening booking modal for service:", service);
                                setServiceToBook(service);
                            }}
                        >
                            <Calendar size={16} />
                            Book Service
                        </button>
                        <button
                            className={`btn-favorite ${favorites.has(`service_${service.id}`) ? 'active' : ''}`}
                            onClick={() => handleFavoriteToggle(service, 'service')}
                        >
                            <Heart size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="user-explore">
            <div className="explore-header">
                <h1>Explore Businesses</h1>
                <p>Discover local businesses, services, and products in your area</p>
            </div>

            {/* Search and Filters */}
            <div className="explore-controls">
                <div className="search-section">
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search businesses, services, or products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                </div>

                {/* Content Type Tabs */}
                <div className="content-tabs">
                    <button
                        className={`tab ${activeTab === 'businesses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('businesses')}
                    >
                        <ShoppingBag size={18} />
                        Businesses
                    </button>
                    <button
                        className={`tab ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => setActiveTab('products')}
                    >
                        <Package size={18} />
                        Products
                    </button>
                    <button
                        className={`tab ${activeTab === 'services' ? 'active' : ''}`}
                        onClick={() => setActiveTab('services')}
                    >
                        <Calendar size={18} />
                        Services
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="explore-results">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading {activeTab}...</p>
                    </div>
                ) : (
                    <>
                        <div className="results-header">
                            <h2>
                                {activeTab === 'businesses' && 'Businesses'}
                                {activeTab === 'products' && 'Products'}
                                {activeTab === 'services' && 'Services'}
                                <span className="count">
                                    ({
                                        activeTab === 'businesses' ? filteredBusinesses.length :
                                            activeTab === 'products' ? filteredProducts.length :
                                                filteredServices.length
                                    })
                                </span>
                            </h2>

                        </div>

                        <div className="results-grid">
                            {activeTab === 'businesses' && (
                                filteredBusinesses.length > 0 ? (
                                    filteredBusinesses.map(renderBusinessCard)
                                ) : (
                                    <div className="no-results">
                                        <ShoppingBag size={48} />
                                        <h3>No businesses found</h3>
                                        <p>
                                            {searchTerm
                                                ? "Try adjusting your search or filters"
                                                : "No businesses are currently registered in the database"
                                            }
                                        </p>
                                    </div>
                                )
                            )}

                            {activeTab === 'products' && (
                                filteredProducts.length > 0 ? (
                                    filteredProducts.map(renderProductCard)
                                ) : (
                                    <div className="no-results">
                                        <Package size={48} />
                                        <h3>No products found</h3>
                                        <p>
                                            {searchTerm
                                                ? "Try adjusting your search or filters"
                                                : "No products are currently available in the database"
                                            }
                                        </p>
                                    </div>
                                )
                            )}

                            {activeTab === 'services' && (
                                filteredServices.length > 0 ? (
                                    filteredServices.map(renderServiceCard)
                                ) : (
                                    <div className="no-results">
                                        <Calendar size={48} />
                                        <h3>No services found</h3>
                                        <p>
                                            {searchTerm
                                                ? "Try adjusting your search or filters"
                                                : "No services are currently available in the database"
                                            }
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                        {quickViewProduct && (
                            <ProductQuickView
                                product={quickViewProduct}
                                onClose={() => setQuickViewProduct(null)}
                            />
                        )}

                        {serviceToBook && (
                            <ServiceBookingModal
                                service={serviceToBook}
                                onClose={() => setServiceToBook(null)}
                                onSuccess={(bookingDetails) => {
                                    console.log("Booking successful:", bookingDetails);
                                    setServiceToBook(null);
                                    // You could navigate to the bookings tab or show a success message
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default UserExplore;
