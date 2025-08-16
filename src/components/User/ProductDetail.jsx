import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingBag, ArrowLeft, Heart, Share2, Check, Calendar as CalIcon, Clock } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../Firebase/config';
import { addToFavorites, removeFromFavorites, checkIfFavorite } from '../../Firebase/favoriteDb';
import { createOrder, updatePaymentStatus } from '../../Firebase/ordersDb';
import { getReviews, getReviewStats } from '../../Firebase/reviewDb_new';
import { openRazorpayCheckout } from '../../utils/razorpay';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ReviewsList from '../miniComponents/ReviewsList';

function ProductDetail() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isSaved, setIsSaved] = useState(false);
    const [business, setBusiness] = useState(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'online' | 'cash'
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState(null);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [lastReviewDoc, setLastReviewDoc] = useState(null);
    const [hasMoreReviews, setHasMoreReviews] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Try to find in Available products first
                let productDoc = await getDoc(doc(db, "Products", productId));

                if (!productDoc.exists()) {
                    // If not found, check in Available subcollection of each business
                    const businessesQuery = await getDocs(collection(db, "Businesses"));
                    for (const businessDoc of businessesQuery.docs) {
                        const businessId = businessDoc.id;
                        const availableProductDoc = await getDoc(doc(db, "Products", businessId, "Available", productId));
                        if (availableProductDoc.exists()) {
                            productDoc = availableProductDoc;
                            break;
                        }

                        // If not in Available, check in Unavailable
                        const unavailableProductDoc = await getDoc(doc(db, "Products", businessId, "Unavailable", productId));
                        if (unavailableProductDoc.exists()) {
                            productDoc = unavailableProductDoc;
                            break;
                        }
                    }
                }

                if (productDoc.exists()) {
                    const productData = { id: productDoc.id, ...productDoc.data() };
                    setProduct(productData);

                    // Fetch business info
                    if (productData.businessId) {
                        const businessDoc = await getDoc(doc(db, "Businesses", productData.businessId));
                        if (businessDoc.exists()) {
                            setBusiness(businessDoc.data());
                        }
                    }

                    // Check if product is in user's favorites
                    if (currentUser) {
                        const favoriteStatus = await checkIfFavorite(currentUser.email, productId, 'product');
                        setIsSaved(!!favoriteStatus);
                    }
                } else {
                    console.error("Product not found!");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [productId, currentUser]);

    // Fetch reviews for the product
    useEffect(() => {
        const fetchReviews = async () => {
            if (!productId || !product?.businessId) return;

            try {
                setLoadingReviews(true);

                // Get review stats
                const stats = await getReviewStats('product', product.businessId, productId);
                setReviewStats(stats);

                // Get reviews with pagination
                const reviewsData = await getReviews('product', product.businessId, productId, 5);
                setReviews(reviewsData.reviews || []);
                setLastReviewDoc(reviewsData.lastVisible);
                setHasMoreReviews(reviewsData.reviews?.length === 5);

            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoadingReviews(false);
            }
        };

        fetchReviews();
    }, [productId, product]);

    const handleLoadMoreReviews = async () => {
        if (!productId || !product?.businessId || !lastReviewDoc) return;

        try {
            setLoadingReviews(true);

            // Get more reviews with pagination
            const reviewsData = await getReviews('product', product.businessId, productId, 5, lastReviewDoc);

            // Append new reviews to existing ones
            setReviews([...reviews, ...(reviewsData.reviews || [])]);
            setLastReviewDoc(reviewsData.lastVisible);
            setHasMoreReviews(reviewsData.reviews?.length === 5);

        } catch (error) {
            console.error("Error loading more reviews:", error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity >= 1) {
            setQuantity(newQuantity);
        }
    };

    const handleSaveProduct = async () => {
        if (!currentUser) {
            // Redirect to login if not logged in
            toast.info("Please log in to save products to your favorites");
            navigate('/login', { state: { from: `/product/${productId}` } });
            return;
        }

        try {
            if (isSaved) {
                // Remove from favorites
                await removeFromFavorites(currentUser.email, productId, 'product');
                setIsSaved(false);
                toast.success("Product removed from favorites");
            } else {
                // Add to favorites
                const productData = {
                    name: product.name,
                    imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
                    price: product.price,
                    businessId: product.businessId
                };

                await addToFavorites(currentUser.email, productId, 'product', productData);
                setIsSaved(true);
                toast.success("Product added to favorites");
            }
        } catch (error) {
            console.error("Error updating favorites:", error);
            toast.error("There was an error updating your favorites");
        }
    };

    const handleBuyNow = () => {
        if (!currentUser) {
            toast.info('Please log in to continue');
            navigate('/login', { state: { from: `/product/${productId}` } });
            return;
        }
        setCheckoutOpen(true);
    };

    const parsePickupTimestamp = () => {
        try {
            if (!pickupDate || !pickupTime) return null;
            const dt = new Date(`${pickupDate}T${pickupTime}:00`);
            if (isNaN(dt.getTime())) return null;
            return Timestamp.fromDate(dt);
        } catch {
            return null;
        }
    };

    const startOnlinePayment = async (totalPaise, orderDraft) => {
        // NOTE: In production, create a Razorpay order server-side and pass order_id here.
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1234567890',
            amount: totalPaise,
            currency: 'INR',
            name: business?.businessName || 'UdhyogUnity Store',
            description: `${product.name} x ${quantity}`,
            prefill: {
                name: currentUser?.displayName || currentUser?.email?.split('@')[0],
                email: currentUser?.email,
            },
            notes: { productId: product.id, businessEmail: product.businessEmail || product.businessId },
            theme: { color: '#0ea5e9' },
        };

        const result = await openRazorpayCheckout(options);
        if (result.success) {
            // Persist payment details on order after we create it
            return { paid: true, details: { provider: 'razorpay', ...result.response } };
        }
        if (result.dismissed) return { paid: false, cancelled: true };
        return { paid: false, error: result.error };
    };

    const handlePlaceOrder = async () => {
        setOrderError('');
        if (!currentUser || !product) return;

        const pickupTs = parsePickupTimestamp();
        if (!pickupTs) {
            setOrderError('Please select a valid pickup date and time.');
            return;
        }

        const total = (product.price || 0) * quantity;
        const totalPaise = Math.round(total * 100);
        setPlacingOrder(true);

        try {
            let paymentStatus = paymentMethod === 'online' ? 'paid' : 'pending';
            let status = paymentMethod === 'online' ? 'Paid' : 'Pending';
            let paymentDetails = {};

            if (paymentMethod === 'online') {
                const payRes = await startOnlinePayment(totalPaise, {});
                if (payRes.cancelled) {
                    setPlacingOrder(false);
                    return; // user closed modal
                }
                if (!payRes.paid) {
                    throw new Error(payRes?.error?.description || 'Payment failed');
                }
                paymentDetails = payRes.details;
            }

            const orderPayload = {
                productId: product.id,
                productName: product.name,
                productImage: Array.isArray(product.images) && product.images[0]?.url ? product.images[0].url : (Array.isArray(product.images) ? product.images[0] : ''),
                productPrice: product.price,
                quantity,
                totalAmount: total,
                businessEmail: product.businessEmail || product.businessId,
                businessId: product.businessId || product.businessEmail,
                businessName: business?.businessName || '',
                customerEmail: currentUser.email,
                customerName: currentUser.displayName || currentUser.email?.split('@')[0],
                paymentMethod: paymentMethod === 'online' ? 'online' : 'cash',
                paymentStatus,
                paymentDetails,
                pickupDateTime: pickupTs,
                status,
            };

            const created = await createOrder(orderPayload);

            // If online and we want to update with any server verification step later
            if (paymentMethod === 'online' && paymentDetails?.razorpay_payment_id) {
                await updatePaymentStatus(created.id, 'paid', paymentDetails);
            }

            toast.success('Order placed successfully');
            setCheckoutOpen(false);
            navigate('/dashboard');
        } catch (e) {
            console.error('Order placement failed:', e);
            setOrderError(e.message || 'Failed to place order');
        } finally {
            setPlacingOrder(false);
        }
    };

    const handleContactBusiness = () => {
        // This would implement contact business functionality
        alert(`Contacting ${business?.businessName} about ${product.name}`);
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading product details...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="error-container">
                <h2>Product Not Found</h2>
                <p>Sorry, the product you're looking for doesn't exist or has been removed.</p>
                <button className="btn-primary" onClick={handleGoBack}>
                    <ArrowLeft size={18} />
                    <span>Go Back</span>
                </button>
            </div>
        );
    }

    return (
        <div className="user-dashboard-theme">
            <div className="product-detail-container">
                <button className="back-button" onClick={handleGoBack}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="product-detail-grid">
                    <div className="product-images-section">
                        <div className="main-image">
                            <img
                                src={product.images && product.images.length > 0
                                    ? product.images[selectedImage]
                                    : 'https://via.placeholder.com/500x500?text=No+Image+Available'}
                                alt={product.name}
                            />
                        </div>

                        {product.images && product.images.length > 1 && (
                            <div className="image-thumbnails">
                                {product.images.map((image, index) => (
                                    <div
                                        key={index}
                                        className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                                        onClick={() => setSelectedImage(index)}
                                    >
                                        <img src={image} alt={`${product.name} thumbnail ${index + 1}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="product-info-section">
                        <div className="product-header">
                            <h1 className="product-title">{product.name}</h1>
                            <div className="product-actions">
                                <button
                                    className={`action-button ${isSaved ? 'saved' : ''}`}
                                    onClick={handleSaveProduct}
                                >
                                    <Heart size={20} fill={isSaved ? "#E53935" : "none"} stroke={isSaved ? "#E53935" : "currentColor"} />
                                </button>
                                <button className="action-button">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="product-business">
                            <p>Sold by: <span className="business-name">{business?.businessName || "Unknown Business"}</span></p>
                        </div>

                        <div className="product-ratings">
                            <div className="stars">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        fill={i < Math.floor(product.rating || 0) ? "#FFD700" : "none"}
                                        stroke={i < Math.floor(product.rating || 0) ? "#FFD700" : "currentColor"}
                                    />
                                ))}
                            </div>
                            <span className="rating-value">{product.rating?.toFixed(1) || "No Ratings"}</span>
                            <span className="review-count">({product.reviewCount || 0} reviews)</span>
                        </div>

                        <div className="product-price">
                            <h2>₹{product.price}</h2>
                            {product.originalPrice && (
                                <div className="original-price">
                                    <span className="old-price">₹{product.originalPrice.toFixed(2)}</span>
                                    <span className="discount">
                                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                                    </span>
                                </div>
                            )}
                        </div>

                        {product.availability && (
                            <div className="product-availability">
                                <Check size={16} color="#4CAF50" />
                                <span>In Stock</span>
                            </div>
                        )}

                        <div className="product-description">
                            <h3>Description</h3>
                            <p>{product.description}</p>
                        </div>

                        <div className="product-specs">
                            <h3>Specifications</h3>
                            <ul>
                                {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                                    <li key={key}>
                                        <span className="spec-name">{key}:</span>
                                        <span className="spec-value">{value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="product-actions-bottom">
                            <div className="quantity-control">
                                <button
                                    className="qty-btn"
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                    disabled={quantity <= 1}
                                >-</button>
                                <span className="qty-value">{quantity}</span>
                                <button
                                    className="qty-btn"
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                >+</button>
                            </div>

                            <button className="btn-primary add-to-cart" onClick={handleBuyNow}>
                                <ShoppingBag size={18} />
                                <span>Buy</span>
                            </button>

                            <button className="btn-outline contact-business" onClick={handleContactBusiness}>
                                Contact Business
                            </button>
                        </div>
                    </div>
                </div>

                {/* Product Reviews Section */}
                <div className="product-reviews-section">
                    <h2 className="section-title">Reviews</h2>

                    <ReviewsList
                        reviews={reviews}
                        loading={loadingReviews}
                        onLoadMore={handleLoadMoreReviews}
                        hasMoreReviews={hasMoreReviews}
                        stats={reviewStats}
                        checkIsReviewAuthor={(review) => review.userId === currentUser?.uid}
                    />
                </div>
            </div>

            {checkoutOpen && (
                <div className="modal-overlay">
                    <div className="confirm-modal" style={{ maxWidth: 520 }}>
                        <h3>Checkout</h3>
                        <div className="modal-section">
                            <div className="row" style={{ gap: 12 }}>
                                <div className="col" style={{ flex: 1 }}>
                                    <label className="form-label">Quantity</label>
                                    <div className="quantity-control">
                                        <button className="qty-btn" onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>-</button>
                                        <span className="qty-value">{quantity}</span>
                                        <button className="qty-btn" onClick={() => handleQuantityChange(quantity + 1)}>+</button>
                                    </div>
                                </div>
                                <div className="col" style={{ flex: 1 }}>
                                    <label className="form-label">Payment</label>
                                    <div className="input-group">
                                        <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                            <option value="online">Pay Now</option>
                                            <option value="cash">Pay at Pickup</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="row" style={{ gap: 12, marginTop: 12 }}>
                                <div className="col" style={{ flex: 1 }}>
                                    <label className="form-label">Pickup Date</label>
                                    <div className="input-group">
                                        <span className="input-group-text"><CalIcon size={16} /></span>
                                        <input type="date" className="form-control" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="col" style={{ flex: 1 }}>
                                    <label className="form-label">Pickup Time</label>
                                    <div className="input-group">
                                        <span className="input-group-text"><Clock size={16} /></span>
                                        <input type="time" className="form-control" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="summary" style={{ marginTop: 16 }}>
                                <div className="d-flex" style={{ justifyContent: 'space-between' }}>
                                    <span>Item Total</span>
                                    <strong>₹{(product.price || 0).toFixed(2)} x {quantity} = ₹{(((product.price || 0) * quantity)).toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>

                        {orderError && (
                            <div className="error-message" style={{ marginTop: 8 }}>{orderError}</div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-outline-secondary" onClick={() => setCheckoutOpen(false)} disabled={placingOrder}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handlePlaceOrder} disabled={placingOrder}>
                                {placingOrder ? 'Placing...' : (paymentMethod === 'online' ? 'Pay & Place Order' : 'Place Order')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductDetail;
