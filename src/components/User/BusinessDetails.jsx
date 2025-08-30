import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    MapPin,
    Phone,
    Mail,
    Clock,
    User,
    Star,
    ChevronLeft,
    Globe,
    Calendar,
    Package,
    Heart,
    Home,
    Bookmark,
    X,
    ChevronRight,
    ChevronLeft as ArrowLeft,
    Navigation
} from 'react-feather';
import { getBusinessById } from '../../Firebase/exploreDb';
import { getAllProducts, getAllServices } from '../../Firebase/exploreDb';
import { addToFavorites, removeFromFavorites, checkIfFavorite } from '../../Firebase/favoriteDb';
import { useAuth } from '../../context/AuthContext';
import ContactBusinessButton from '../miniComponents/ContactBusinessButton';
import ProductQuickView from './ProductQuickView';
import ServiceBookingModal from './ServiceBookingModal';
import './BusinessDetails.css';

const BusinessDetails = () => {
    const { businessId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [business, setBusiness] = useState(null);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isFavorite, setIsFavorite] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [serviceToBook, setServiceToBook] = useState(null);
    const [businessPhotos, setBusinessPhotos] = useState([]);
    const [showPhotoGallery, setShowPhotoGallery] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch business details
                const businessData = await getBusinessById(businessId);
                if (!businessData) {
                    setError('Business not found');
                    setLoading(false);
                    return;
                }

                setBusiness(businessData);

                // Fetch business products
                if (businessData.businessType === 'Product' || businessData.businessType === 'Both') {
                    const allProducts = await getAllProducts(null, 100); // Get all products
                    const businessProducts = allProducts.filter(product =>
                        product.businessId === businessId ||
                        product.businessEmail === businessId
                    );
                    setProducts(businessProducts);
                }

                // Fetch business services
                if (businessData.businessType === 'Service' || businessData.businessType === 'Both') {
                    const allServices = await getAllServices(null, 100); // Get all services
                    const businessServices = allServices.filter(service =>
                        service.businessId === businessId ||
                        service.businessEmail === businessId
                    );
                    setServices(businessServices);
                }

                // Check if business is favorited by current user
                if (currentUser) {
                    const favorited = await checkIfFavorite(currentUser.email, businessId, 'business');
                    setIsFavorite(favorited);
                }

                // Process address for map if needed
                if (businessData.address && !businessData.address.latitude && !businessData.address.longitude) {
                    // If there's an address but no coordinates, we might want to geocode in the future
                    // For now, we'll just use the address for a text-based map search
                    console.log("Business has address but no coordinates for map");
                }

                // Extract business photos
                const photos = [];

                // Check for businessPhotos array directly as seen in Firestore
                if (businessData.businessPhotos && Array.isArray(businessData.businessPhotos)) {
                    // Process all images from the businessPhotos array
                    businessData.businessPhotos.forEach(photo => {
                        // Check if the photo has a url property
                        if (photo.url) {
                            photos.push(photo.url);
                        } else if (typeof photo === 'string') {
                            photos.push(photo);
                        }
                    });
                }

                // Add logo if available and not already included
                // if (businessData.logo) {
                //     const logoUrl = typeof businessData.logo === 'string'
                //         ? businessData.logo
                //         : businessData.logo.url;
                //     if (logoUrl && !photos.includes(logoUrl)) {
                //         photos.push(logoUrl);
                //     }
                // }

                // Add cover photo if available and not already included
                if (businessData.coverPhoto) {
                    const coverUrl = typeof businessData.coverPhoto === 'string'
                        ? businessData.coverPhoto
                        : businessData.coverPhoto.url;
                    if (coverUrl && !photos.includes(coverUrl)) {
                        photos.push(coverUrl);
                    }
                }

                // Add any other photos
                if (businessData.photos && Array.isArray(businessData.photos)) {
                    businessData.photos.forEach(photo => {
                        const photoUrl = typeof photo === 'string' ? photo : photo.url;
                        if (photoUrl && !photos.includes(photoUrl)) photos.push(photoUrl);
                    });
                }

                // Use document photos if available
                if (businessData.documents && Array.isArray(businessData.documents)) {
                    businessData.documents.forEach(doc => {
                        if (doc.type === 'image' || (doc.url && doc.url.includes('.jpg') || doc.url.includes('.png') || doc.url.includes('.jpeg'))) {
                            const photoUrl = typeof doc === 'string' ? doc : doc.url;
                            if (photoUrl && !photos.includes(photoUrl)) photos.push(photoUrl);
                        }
                    });
                }

                // If still no photos, add placeholders
                if (photos.length === 0) {
                    photos.push('https://via.placeholder.com/800x400?text=No+Business+Photos+Available');
                }

                console.log('Business photos:', photos);

                setBusinessPhotos(photos);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching business details:", err);
                setError('Failed to load business details. Please try again.');
                setLoading(false);
            }
        };

        fetchData();
    }, [businessId, currentUser]);

    const handleFavoriteToggle = async () => {
        if (!currentUser) {
            alert('Please login to add favorites');
            return;
        }

        try {
            if (isFavorite) {
                await removeFromFavorites(currentUser.email, businessId, 'business');
                setIsFavorite(false);
            } else {
                const favoriteData = {
                    name: business.businessName,
                    businessName: business.businessName,
                    businessType: business.businessType,
                    description: business.description || business.businessDescription || '',
                    location: business.address ? `${business.address.city}, ${business.address.state}` : '',
                    address: business.address || {},
                    rating: business.rating || 4.0,
                    reviewCount: business.reviewCount || 0,
                    category: business.businessType || business.category || '',
                    logo: business.logo || '',
                    isVerified: business.isVerified || false,
                    email: business.email || businessId,
                    phone: business.phoneNumber || '',
                    imageUrl: getImageUrl(business)
                };

                await addToFavorites(currentUser.email, businessId, 'business', favoriteData);
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            alert('Failed to update favorites. Please try again.');
        }
    };

    const getImageUrl = (item) => {
        if (item.logo) {
            return typeof item.logo === 'string' ? item.logo : item.logo.url;
        }
        if (item.images && item.images.length > 0) {
            return typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url;
        }
        if (businessPhotos.length > 0) {
            return businessPhotos[0];
        }
        return 'https://via.placeholder.com/150x150?text=No+Image';
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                size={16}
                fill={index < Math.floor(rating) ? '#FFD700' : 'none'}
                color={index < Math.floor(rating) ? '#FFD700' : '#ccc'}
            />
        ));
    };

    const renderProductCard = (product) => (
        <div key={product.id} className="business-product-card">
            <div className="product-image">
                <img
                    src={product.images && product.images.length > 0 ?
                        (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) :
                        'https://via.placeholder.com/150x150?text=No+Image'}
                    alt={product.name}
                />
                {product.originalPrice && product.originalPrice > product.price && (
                    <div className="discount-badge">
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </div>
                )}
            </div>

            <div className="product-content">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description?.substring(0, 100)}{product.description?.length > 100 ? '...' : ''}</p>

                <div className="product-price">
                    <span className="current-price">₹{product.price?.toLocaleString()}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                        <span className="original-price">₹{product.originalPrice?.toLocaleString()}</span>
                    )}
                </div>

                <div className="product-rating">
                    <div className="stars">
                        {renderStars(product.rating)}
                    </div>
                    <span className="rating-text">
                        ({product.reviewCount || 0})
                    </span>
                </div>

                <div className="product-actions">
                    <button
                        className="btn-view-product"
                        onClick={() => setQuickViewProduct(product)}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );

    const renderServiceCard = (service) => (
        <div key={service.id} className="business-service-card">
            <div className="service-image">
                <img
                    src={service.images && service.images.length > 0 ?
                        (typeof service.images[0] === 'string' ? service.images[0] : service.images[0].url) :
                        'https://via.placeholder.com/150x150?text=No+Image'}
                    alt={service.name}
                />
            </div>

            <div className="service-content">
                <h3>{service.name}</h3>
                <p className="service-description">{service.description?.substring(0, 100)}{service.description?.length > 100 ? '...' : ''}</p>

                <div className="service-details">
                    <div className="service-price">₹{service.price?.toLocaleString()}</div>
                    {service.duration && (
                        <div className="service-duration">
                            <Clock size={14} />
                            <span>{service.duration} min</span>
                        </div>
                    )}
                </div>

                <div className="service-rating">
                    <div className="stars">
                        {renderStars(service.rating || 0)}
                    </div>
                    <span className="rating-text">
                        ({service.reviewCount || 0})
                    </span>
                </div>

                <div className="service-actions">
                    <button
                        className="btn-book-service"
                        onClick={() => setServiceToBook(service)}
                    >
                        Book Service
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="business-details-loading">
                <div className="loading-spinner"></div>
                <p>Loading business details...</p>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="business-details-error">
                <h2>Error</h2>
                <p>{error || 'Business not found'}</p>
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="business-details-container">
            <div className="business-details-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <ChevronLeft size={20} />
                    <span>Back</span>
                </button>
            </div>

            <div className="business-cover-section">
                {businessPhotos.length > 0 && (
                    <div className="business-cover-photo">
                        <img
                            src={businessPhotos[0]}
                            alt={business.businessName}
                            onClick={() => {
                                setCurrentPhotoIndex(0);
                                setShowPhotoGallery(true);
                            }}
                            style={{ cursor: 'pointer' }}
                        />

                        <div className="business-photos-grid">
                            {/* Show thumbnails for photos 2-5 (indices 1-4) */}
                            {businessPhotos.slice(1, 5).map((photo, index) => (
                                <div
                                    key={index}
                                    className="business-photo-thumbnail"
                                    onClick={() => {
                                        setCurrentPhotoIndex(index + 1);
                                        setShowPhotoGallery(true);
                                    }}
                                >
                                    <img src={photo} alt={`${business.businessName} - ${index + 1}`} />
                                </div>
                            ))}
                            {businessPhotos.length > 5 && (
                                <div
                                    className="business-photo-more"
                                    onClick={() => {
                                        setCurrentPhotoIndex(0);
                                        setShowPhotoGallery(true);
                                    }}
                                >
                                    <span>+{businessPhotos.length - 5} more</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="business-main-content">
                <div className="business-header-info">
                    <div className="business-title-section">
                        <div className="business-logo">
                            <img
                                src={typeof business.logo === 'string' ? business.logo : business.logo?.url || getImageUrl(business)}
                                alt={business.businessName}
                            />
                        </div>

                        <div className="business-title-info">
                            <h1>{business.businessName}</h1>
                            <p className="business-type">{business.businessType}</p>

                            <div className="business-rating-info">
                                <div className="business-stars">
                                    {renderStars(business.rating || 0)}
                                </div>
                                <span className="business-review-count">
                                    {business.rating || 0}/5 ({business.reviewCount || 0} reviews)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="business-action-buttons">
                        <ContactBusinessButton
                            businessEmail={business.email || businessId}
                            businessName={business.businessName}
                            initialMessage={`Hello! I'm interested in your business.`}
                            buttonText="Message"
                            className="btn"
                        />

                        <button
                            className={`btn-favorite-business ${isFavorite ? 'active' : ''}`}
                            onClick={handleFavoriteToggle}
                        >
                            {isFavorite ? 'Saved' : 'Save'}
                            <Heart size={16} fill={isFavorite ? "#e74c3c" : "none"} color={isFavorite ? "#e74c3c" : "currentColor"} />
                        </button>
                    </div>
                </div>

                <div className="business-navigation">
                    <button
                        className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <Home size={16} />
                        Overview
                    </button>

                    {(business.businessType === 'Product' || business.businessType === 'Both') && products.length > 0 && (
                        <button
                            className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
                            onClick={() => setActiveTab('products')}
                        >
                            <Package size={16} />
                            Products ({products.length})
                        </button>
                    )}

                    {(business.businessType === 'Service' || business.businessType === 'Both') && services.length > 0 && (
                        <button
                            className={`nav-tab ${activeTab === 'services' ? 'active' : ''}`}
                            onClick={() => setActiveTab('services')}
                        >
                            <Calendar size={16} />
                            Services ({services.length})
                        </button>
                    )}

                    <button
                        className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
                        onClick={() => setActiveTab('about')}
                    >
                        <Bookmark size={16} />
                        About
                    </button>
                </div>

                <div className="business-tab-content">
                    {activeTab === 'overview' && (
                        <div className="business-overview">
                            <div className="business-description-section">
                                <h2>About {business.businessName}</h2>
                                <p className="business-text">{business.description || business.businessDescription || 'No description available for this business.'}</p>
                            </div>

                            <div className="business-info-section">
                                <h2>Business Information</h2>
                                <div className="info-grid">
                                    {business.address && (
                                        <div className="info-item">
                                            <MapPin size={16} />
                                            <span>
                                                {business.cityName && `${business.cityName}`}, {business.stateName && `${business.stateName}`}
                                            </span>
                                        </div>
                                    )}

                                    {business.phoneNumber && (
                                        <div className="info-item">
                                            <Phone size={16} />
                                            <span>{business.phoneNumber}</span>
                                        </div>
                                    )}

                                    {business.email && (
                                        <div className="info-item">
                                            <Mail size={16} />
                                            <span>{business.email}</span>
                                        </div>
                                    )}

                                    {business.website && (
                                        <div className="info-item">
                                            <Globe size={16} />
                                            <a href={business.website} target="_blank" rel="noopener noreferrer">
                                                {business.website}
                                            </a>
                                        </div>
                                    )}

                                    {business.businessHours && (
                                        <div className="info-item">
                                            <Clock size={16} />
                                            <div className="business-hours">
                                                <strong>Business Hours:</strong>
                                                <ul>
                                                    {Object.entries(business.businessHours).map(([day, hours]) => (
                                                        <li key={day}>
                                                            <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                                                            <span className="hours">
                                                                {hours.isOpen ? `${hours.start} - ${hours.end}` : 'Closed'}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="business-offerings-preview">
                                {products.length > 0 && (
                                    <div className="preview-section">
                                        <div className="section-header">
                                            <h2>Featured Products</h2>
                                            <button
                                                className="btn-view-all"
                                                onClick={() => setActiveTab('products')}
                                            >
                                                View All
                                            </button>
                                        </div>

                                        <div className="preview-cards">
                                            {products.slice(0, 3).map(renderProductCard)}
                                        </div>
                                    </div>
                                )}

                                {services.length > 0 && (
                                    <div className="preview-section">
                                        <div className="section-header">
                                            <h2>Featured Services</h2>
                                            <button
                                                className="btn-view-all"
                                                onClick={() => setActiveTab('services')}
                                            >
                                                View All
                                            </button>
                                        </div>

                                        <div className="preview-cards">
                                            {services.slice(0, 3).map(renderServiceCard)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="business-map-section">
                                <h2>Location</h2>
                                <div className="map-container">
                                    {business.location && business.location.lat && business.location.lng ? (
                                        <>
                                            <div className="google-map">
                                                <iframe
                                                    title="Business Location"
                                                    width="100%"
                                                    height="100%"
                                                    frameBorder="0"
                                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${business.location.lat},${business.location.lng}&zoom=15`}
                                                    allowFullScreen
                                                />
                                            </div>
                                            <div className="map-actions">
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-directions"
                                                >
                                                    <Navigation size={16} />
                                                    Get Directions
                                                </a>
                                            </div>
                                        </>
                                    ) : business.address ? (
                                        <div className="map-placeholder">
                                            <MapPin size={24} />
                                            <p>
                                                {typeof business.address === 'string'
                                                    ? business.address
                                                    : `${business.address.street || ''} ${business.address.city || ''} ${business.address.state || ''} ${business.address.pincode || ''}`}
                                            </p>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                    business.businessName + ' ' + (typeof business.address === 'string' ? business.address : '')
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-directions mt-3"
                                            >
                                                <Navigation size={16} />
                                                Find on Google Maps
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="map-placeholder">
                                            <MapPin size={24} />
                                            <p>No location information available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="business-products">
                            <h2>Products by {business.businessName}</h2>
                            {products.length > 0 ? (
                                <div className="products-grid">
                                    {products.map(renderProductCard)}
                                </div>
                            ) : (
                                <div className="no-items-message">
                                    <Package size={48} />
                                    <h3>No products available</h3>
                                    <p>This business hasn't added any products yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'services' && (
                        <div className="business-services">
                            <h2>Services by {business.businessName}</h2>
                            {services.length > 0 ? (
                                <div className="services-grid">
                                    {services.map(renderServiceCard)}
                                </div>
                            ) : (
                                <div className="no-items-message">
                                    <Calendar size={48} />
                                    <h3>No services available</h3>
                                    <p>This business hasn't added any services yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="business-about">
                            <h2>About {business.businessName}</h2>

                            <div className="business-full-description">
                                <h3>Description</h3>
                                <p className="business-text">{business.description || business.businessDescription || 'No description available.'}</p>
                            </div>

                            {business.businessStory && (
                                <div className="business-story">
                                    <h3>Our Story</h3>
                                    <p className="business-text">{business.businessStory}</p>
                                </div>
                            )}

                            {business.specialties && (
                                <div className="business-specialties">
                                    <h3>Specialties</h3>
                                    <p className="business-text">{business.specialties}</p>
                                </div>
                            )}

                            {business.establishedYear && (
                                <div className="business-established">
                                    <h3>Established</h3>
                                    <p>{business.establishedYear}</p>
                                </div>
                            )}

                            <div className="business-info">
                                <h3>Contact Information</h3>
                                <div className='info-grid'>
                                    <div className='info-item'><User size={20} /> <span>{business.ownerName || 'Unknown'}</span></div>
                                    <div className="info-item">
                                        <Phone size={16} />
                                        <span>{business.phoneNumber}</span>
                                    </div>
                                    <div className="info-item">
                                        <Mail size={16} />
                                        <span>{business.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
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
                        // Optionally navigate to bookings
                        // navigate('/bookings');
                    }}
                />
            )}

            {/* Photo Gallery Modal */}
            {showPhotoGallery && (
                <div className="photo-gallery-modal">
                    <div className="photo-gallery-header">
                        <h3>{business.businessName} Photos</h3>
                        <button className="close-gallery" onClick={() => setShowPhotoGallery(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    <div className="photo-gallery-content">
                        <button
                            className="gallery-nav prev"
                            onClick={() => setCurrentPhotoIndex(prev =>
                                prev === 0 ? businessPhotos.length - 1 : prev - 1
                            )}
                            disabled={businessPhotos.length <= 1}
                        >
                            <ArrowLeft size={30} />
                        </button>
                        <div className="gallery-main-image">
                            <img
                                src={businessPhotos[currentPhotoIndex]}
                                alt={`${business.businessName} photo ${currentPhotoIndex + 1}`}
                            />
                        </div>
                        <button
                            className="gallery-nav next"
                            onClick={() => setCurrentPhotoIndex(prev =>
                                prev === businessPhotos.length - 1 ? 0 : prev + 1
                            )}
                            disabled={businessPhotos.length <= 1}
                        >
                            <ChevronRight size={30} />
                        </button>
                    </div>
                    <div className="photo-gallery-thumbnails">
                        {businessPhotos.map((photo, index) => (
                            <div
                                key={index}
                                className={`gallery-thumbnail ${currentPhotoIndex === index ? 'active' : ''}`}
                                onClick={() => setCurrentPhotoIndex(index)}
                            >
                                <img src={photo} alt={`Thumbnail ${index + 1}`} />
                            </div>
                        ))}
                    </div>
                    <div className="photo-counter">
                        {currentPhotoIndex + 1} / {businessPhotos.length}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessDetails;
