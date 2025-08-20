import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MessageCircle, Filter, Search, Calendar, User, MoreHorizontal, Eye, Flag, Trash2, RefreshCw } from 'react-feather';
import { useAuth } from '../../../context/AuthContext';
import {
    getReviews,
    getReviewStats,
    respondToReview,
    getRecentBusinessReviews
} from '../../../Firebase/reviewDb_new';
import { getCurrentBusinessEmail } from '../../../Firebase/getBusinessData';
import { db } from '../../../Firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import './ReviewsSettings.css';

const ReviewsSettings = ({ onUpdate, businessData: propBusinessData }) => {
    const { currentUser, businessData: authBusinessData } = useAuth();
    // Prioritize business data from props over context
    const businessData = propBusinessData || authBusinessData || {};
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedReview, setSelectedReview] = useState(null);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [reviewStats, setReviewStats] = useState(null);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMoreReviews, setHasMoreReviews] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Load reviews from Firebase instead of using mock data
    useEffect(() => {
        loadReviews();
    }, [currentUser, businessData]);

    const loadReviews = async () => {
        console.log("BusinessData available:", businessData);

        // Use the email as the identifier as seen in Firebase
        // businessEmail is used as the document ID
        const businessEmail = businessData?.email || getCurrentBusinessEmail();
        console.log("Using business email:", businessEmail);

        if (!businessEmail) {
            console.error("No valid business email found in businessData:", businessData);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("Loading reviews for business:", businessEmail);

            // Get business reviews from Firestore
            const businessResult = await getReviews('business', businessEmail, null, 10);
            console.log("Business reviews result:", businessResult);

            const businessReviews = businessResult.reviews || [];
            setLastVisible(businessResult.lastVisible);
            setHasMoreReviews(businessResult.reviews?.length === 10);

            // Fetch products for this business (Available + Unavailable)
            const availCol = collection(db, 'Products', businessEmail, 'Available');
            const unavailCol = collection(db, 'Products', businessEmail, 'Unavailable');
            const [availSnap, unavailSnap] = await Promise.all([getDocs(availCol), getDocs(unavailCol)]);

            const allProducts = [...availSnap.docs, ...unavailSnap.docs].map(d => ({ id: d.id, ...d.data() }));
            console.log(`Found ${allProducts.length} products for business:`, businessEmail);

            // For each product, fetch recent product reviews (limit 5 each) and tag with product info
            const productReviewPromises = allProducts.map(async (p) => {
                try {
                    console.log(`Fetching reviews for product: ${p.id}, business: ${businessEmail}`);
                    const pr = await getReviews('product', businessEmail, p.id, 5);
                    console.log(`Reviews for product ${p.id}:`, pr.reviews?.length || 0);

                    // Tag each review with product metadata
                    return (pr.reviews || []).map(r => ({ ...r, itemId: p.id, productName: p.name || p.productName || '', _reviewType: 'product' }));
                } catch (e) {
                    console.error('Error fetching product reviews for', p.id, e);
                    return [];
                }
            });

            // Fetch services for this business
            const activeServicesCol = collection(db, 'Services', businessEmail, 'Active');
            const activeServicesSnap = await getDocs(activeServicesCol);
            const allServices = [...activeServicesSnap.docs].map(d => ({ id: d.id, ...d.data() }));
            console.log(`Found ${allServices.length} services for business:`, businessEmail);

            // For each service, fetch recent service reviews (limit 5 each) and tag with service info
            const serviceReviewPromises = allServices.map(async (s) => {
                try {
                    console.log(`Fetching reviews for service: ${s.id}, business: ${businessEmail}`);
                    const sr = await getReviews('service', businessEmail, s.id, 5);
                    console.log(`Reviews for service ${s.id}:`, sr.reviews?.length || 0);

                    // Tag each review with service metadata
                    return (sr.reviews || []).map(r => ({ ...r, itemId: s.id, serviceName: s.name || s.serviceName || s.title || '', _reviewType: 'service' }));
                } catch (e) {
                    console.error('Error fetching service reviews for', s.id, e);
                    return [];
                }
            });

            const [productReviewsArrays, serviceReviewsArrays] = await Promise.all([
                Promise.all(productReviewPromises),
                Promise.all(serviceReviewPromises)
            ]);

            const productReviews = productReviewsArrays.flat();
            const serviceReviews = serviceReviewsArrays.flat();

            // Tag business reviews and combine all reviews
            const taggedBusinessReviews = businessReviews.map(r => ({ ...r, _reviewType: 'business' }));

            const combined = [...taggedBusinessReviews, ...productReviews, ...serviceReviews];

            // Sort combined reviews by createdAt desc
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setReviews(combined);
            setFilteredReviews(combined);

            // Get review statistics
            const stats = await getReviewStats('business', businessEmail);
            setReviewStats(stats);

        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreReviews = async () => {
        const businessEmail = businessData?.email || getCurrentBusinessEmail();
        if (!businessEmail || !lastVisible) return;

        try {
            setLoadingMore(true);

            // Get more reviews starting after the last visible document
            const result = await getReviews('business', businessEmail, null, 10, lastVisible);

            const taggedBusinessReviews = result.reviews.map(r => ({ ...r, _reviewType: 'business' }));

            // Append new reviews to existing ones
            setReviews(prevReviews => [...prevReviews, ...taggedBusinessReviews]);
            setLastVisible(result.lastVisible);
            setHasMoreReviews(result.reviews.length === 10);

        } catch (error) {
            console.error('Error loading more reviews:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // Removed mock reviews logic - use real data only
        filterAndSortReviews();
    }, [reviews, filterRating, filterType, searchTerm, sortBy, loading]);

    const filterAndSortReviews = () => {
        let filtered = [...reviews];

        // Filter by rating
        if (filterRating !== 'all') {
            filtered = filtered.filter(review => review.rating === parseInt(filterRating));
        }

        // Filter by review type
        if (filterType !== 'all') {
            filtered = filtered.filter(review => review._reviewType === filterType);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(review =>
                review.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (review.productName && review.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (review.serviceName && review.serviceName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Sort reviews
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'highest':
                    return b.rating - a.rating;
                case 'lowest':
                    return a.rating - b.rating;
                case 'helpful':
                    return (b.helpful || 0) - (a.helpful || 0);
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        setFilteredReviews(filtered);
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                size={16}
                className={index < rating ? 'star-filled' : 'star-empty'}
                fill={index < rating ? '#ffc107' : 'none'}
            />
        ));
    };

    const calculateAverageRating = () => {
        if (reviewStats) {
            return reviewStats.averageRating.toFixed(1);
        }

        if (reviews.length === 0) return 0;
        const total = reviews.reduce((sum, review) => sum + review.rating, 0);
        return (total / reviews.length).toFixed(1);
    };

    const getRatingDistribution = () => {
        if (reviewStats) {
            return reviewStats.ratingCounts;
        }

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) {
                distribution[Math.floor(review.rating)]++;
            }
        });
        return distribution;
    };

    const handleReply = (review) => {
        setSelectedReview(review);
        setReplyText(review.businessResponse?.text || '');
        setShowReplyModal(true);
    };

    const submitReply = async () => {
        const businessEmail = businessData?.email || getCurrentBusinessEmail();
        if (!selectedReview || !replyText.trim() || !businessEmail) return;

        try {
            // Call Firebase to add or update reply based on review type
            if (selectedReview._reviewType === 'product') {
                await respondToReview(
                    'product',
                    businessEmail,
                    selectedReview.itemId,
                    selectedReview.id,
                    replyText.trim()
                );
            } else if (selectedReview._reviewType === 'service') {
                await respondToReview(
                    'service',
                    businessEmail,
                    selectedReview.itemId,
                    selectedReview.id,
                    replyText.trim()
                );
            } else {
                await respondToReview(
                    'business',
                    businessEmail,
                    null,
                    selectedReview.id,
                    replyText.trim()
                );
            }

            // Update local state
            const updatedReviews = reviews.map(review => {
                if (review.id === selectedReview.id) {
                    return {
                        ...review,
                        businessResponse: {
                            text: replyText.trim(),
                            createdAt: new Date()
                        },
                        replied: true
                    };
                }
                return review;
            });

            setReviews(updatedReviews);
            setShowReplyModal(false);
            setReplyText('');
            setSelectedReview(null);

        } catch (error) {
            console.error('Error submitting reply:', error);
            alert('Failed to submit reply. Please try again.');
        }
    };

    const formatDate = (dateString) => {
        const d = dateString ? (dateString.toDate ? dateString.toDate() : new Date(dateString)) : new Date();
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="reviews-loading">
                <div className="spinner"></div>
                <p>Loading reviews...</p>
            </div>
        );
    }

    const ratingDistribution = getRatingDistribution();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="reviews-settings"
        >
            <div className="reviews-header">
                <h2>Customer Reviews</h2>
                <p>Manage and respond to customer feedback</p>
            </div>

            {/* Reviews Overview */}
            <div className="reviews-overview">
                <div className="rating-summary">
                    <div className="average-rating">
                        <div className="rating-value">{calculateAverageRating()}</div>
                        <div className="rating-stars">
                            {renderStars(Math.round(calculateAverageRating()))}
                        </div>
                        <div className="total-reviews">{reviews.length} reviews</div>
                    </div>

                    <div className="rating-breakdown">
                        {[5, 4, 3, 2, 1].map(rating => (
                            <div key={rating} className="rating-bar">
                                <span className="rating-number">{rating}</span>
                                <Star size={14} fill="#ffc107" />
                                <div className="bar-container">
                                    <div
                                        className="bar-fill"
                                        style={{
                                            width: `${reviews.length > 0 ? (ratingDistribution[rating] / reviews.length) * 100 : 0}%`
                                        }}
                                    ></div>
                                </div>
                                <span className="rating-count">{ratingDistribution[rating]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="reviews-stats">
                    <div className="stat-item">
                        <div className="stat-value">{reviews.filter(r => !r.businessResponse).length}</div>
                        <div className="stat-label">Pending Replies</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{reviews.filter(r => r.businessResponse).length}</div>
                        <div className="stat-label">Replied Reviews</div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="reviews-controls">

                <div className="filter-controls">
                    <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>


                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>

                    <button className="refresh-button" onClick={loadReviews}>
                        <RefreshCw size={16} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Reviews List */}
            <div className="reviews-list">
                <AnimatePresence>
                    {filteredReviews.map((review) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`review-card ${!review.replied ? 'needs-reply' : ''}`}
                        >
                            <div className="review-header">
                                <div className="customer-info">
                                    <div className="customer-avatar">
                                        {review.userPhotoURL ? (
                                            <img
                                                src={review.userPhotoURL}
                                                alt={review.userName || review.customerName || 'User'}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = null;
                                                    const nameInitial = (review.userName || review.customerName || 'U').charAt(0);
                                                    if (e.target && e.target.parentNode) {
                                                        e.target.parentNode.innerHTML = nameInitial;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(review.userName || review.customerName || 'U').charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="customer-details">
                                        <div className="customer-name">
                                            {review.userName || review.customerName || 'Anonymous User'}
                                        </div>
                                        <div className="review-date">
                                            <Calendar size={12} />
                                            {formatDate(review.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="review-content">
                                <div className="review-rating">
                                    {renderStars(review.rating)}
                                </div>
                                {/* Show product name for product reviews */}
                                {review._reviewType === 'product' && (
                                    <div className="product-context">Product: <strong>{review.productName || review.itemId}</strong></div>
                                )}
                                {/* Show service name for service reviews */}
                                {review._reviewType === 'service' && (
                                    <div className="product-context service-context">Service: <strong>{review.serviceName || review.itemId}</strong></div>
                                )}
                                <h4 className="review-title">{review.title || ''}</h4>
                                <p className="review-comment">{review.comment || review.text || ''}</p>

                                <div className="review-meta">
                                    <button
                                        className={`reply-btn ${review.replied ? 'replied' : 'needs-reply'}`}
                                        onClick={() => handleReply(review)}
                                    >
                                        <MessageCircle size={14} />
                                        {review.replied ? 'Edit Reply' : 'Reply'}
                                    </button>
                                </div>

                                {review.businessResponse && (
                                    <div className="business-reply">
                                        <div className="reply-header">
                                            <strong>Your Reply</strong>
                                            <span className="reply-date">{formatDate(review.businessResponse.createdAt)}</span>
                                        </div>
                                        <p className="reply-text">{review.businessResponse.text}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredReviews.length === 0 && (
                    <div className="no-reviews">
                        <Star size={48} />
                        <h3>No reviews found</h3>
                        <p>No reviews match your current filters or this business hasn't received any reviews yet.</p>
                    </div>
                )}
            </div>

            {/* Load More Button */}
            {hasMoreReviews && (
                <div className="load-more-container">
                    <button
                        className="load-more-button"
                        onClick={loadMoreReviews}
                        disabled={loadingMore}
                    >
                        {loadingMore ? (
                            <>
                                <div className="spinner-small"></div>
                                Loading...
                            </>
                        ) : (
                            'Load More Reviews'
                        )}
                    </button>
                </div>
            )}

            {/* Reply Modal */}
            <AnimatePresence>
                {showReplyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay"
                        onClick={() => setShowReplyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="reply-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Reply to Review</h3>
                                <button
                                    className="close-btn"
                                    onClick={() => setShowReplyModal(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="modal-content">
                                <div className="original-review">
                                    <div className="review-rating">
                                        {renderStars(selectedReview?.rating || 0)}
                                    </div>
                                    <p>"{selectedReview?.comment || selectedReview?.text || ''}"</p>
                                    <small>- {selectedReview?.userName || selectedReview?.customerName || 'Anonymous User'}</small>
                                </div>

                                <div className="reply-form">
                                    <label>Your Reply</label>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a professional and helpful reply..."
                                        rows="4"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowReplyModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={submitReply}
                                    disabled={!replyText.trim()}
                                >
                                    {selectedReview?.businessResponse ? 'Update Reply' : 'Send Reply'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ReviewsSettings;
