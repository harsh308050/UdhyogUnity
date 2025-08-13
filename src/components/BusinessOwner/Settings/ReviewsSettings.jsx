import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MessageCircle, Filter, Search, Calendar, User, MoreHorizontal, Eye, Flag, Trash2 } from 'react-feather';

const ReviewsSettings = ({ businessData, onUpdate }) => {
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedReview, setSelectedReview] = useState(null);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyText, setReplyText] = useState('');

    // Mock reviews data - replace with actual Firebase data
    const mockReviews = [
        {
            id: '1',
            customerName: 'John Smith',
            customerAvatar: null,
            rating: 5,
            title: 'Excellent service!',
            comment: 'The product quality is outstanding and delivery was very fast. Highly recommend this business to everyone.',
            date: '2024-01-15',
            helpful: 12,
            notHelpful: 1,
            replied: true,
            businessReply: 'Thank you so much for your kind words! We really appreciate your feedback.',
            replyDate: '2024-01-16',
            verified: true
        },
        {
            id: '2',
            customerName: 'Sarah Johnson',
            customerAvatar: null,
            rating: 4,
            title: 'Good experience overall',
            comment: 'Product was as described and shipping was reasonable. Minor packaging issue but nothing major.',
            date: '2024-01-10',
            helpful: 8,
            notHelpful: 0,
            replied: false,
            verified: true
        },
        {
            id: '3',
            customerName: 'Mike Wilson',
            customerAvatar: null,
            rating: 3,
            title: 'Average service',
            comment: 'The product is okay but took longer than expected to arrive. Customer service was responsive though.',
            date: '2024-01-08',
            helpful: 5,
            notHelpful: 2,
            replied: true,
            businessReply: 'We apologize for the delay and are working to improve our delivery times. Thank you for your patience.',
            replyDate: '2024-01-09',
            verified: false
        },
        {
            id: '4',
            customerName: 'Emily Davis',
            customerAvatar: null,
            rating: 5,
            title: 'Amazing quality!',
            comment: 'Exceeded my expectations in every way. Will definitely order again!',
            date: '2024-01-05',
            helpful: 15,
            notHelpful: 0,
            replied: false,
            verified: true
        },
        {
            id: '5',
            customerName: 'Robert Brown',
            customerAvatar: null,
            rating: 2,
            title: 'Not satisfied',
            comment: 'Product did not match the description and quality was poor. Disappointed with this purchase.',
            date: '2024-01-03',
            helpful: 3,
            notHelpful: 8,
            replied: false,
            verified: true
        }
    ];

    useEffect(() => {
        // Simulate loading reviews
        setTimeout(() => {
            setReviews(mockReviews);
            setFilteredReviews(mockReviews);
            setLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        filterAndSortReviews();
    }, [reviews, filterRating, searchTerm, sortBy]);

    const filterAndSortReviews = () => {
        let filtered = [...reviews];

        // Filter by rating
        if (filterRating !== 'all') {
            filtered = filtered.filter(review => review.rating === parseInt(filterRating));
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(review =>
                review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort reviews
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'highest':
                    return b.rating - a.rating;
                case 'lowest':
                    return a.rating - b.rating;
                case 'helpful':
                    return b.helpful - a.helpful;
                default:
                    return new Date(b.date) - new Date(a.date);
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
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((sum, review) => sum + review.rating, 0);
        return (total / reviews.length).toFixed(1);
    };

    const getRatingDistribution = () => {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            distribution[review.rating]++;
        });
        return distribution;
    };

    const handleReply = (review) => {
        setSelectedReview(review);
        setReplyText(review.businessReply || '');
        setShowReplyModal(true);
    };

    const submitReply = () => {
        // Handle reply submission
        console.log('Submitting reply:', replyText);
        setShowReplyModal(false);
        setReplyText('');
        setSelectedReview(null);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
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
                        <div className="stat-value">{reviews.filter(r => !r.replied).length}</div>
                        <div className="stat-label">Pending Replies</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{reviews.filter(r => r.verified).length}</div>
                        <div className="stat-label">Verified Reviews</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{reviews.reduce((sum, r) => sum + r.helpful, 0)}</div>
                        <div className="stat-label">Helpful Votes</div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="reviews-controls">
                <div className="search-filter">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

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
                        <option value="helpful">Most Helpful</option>
                    </select>
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
                                        {review.customerAvatar ? (
                                            <img src={review.customerAvatar} alt={review.customerName} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {review.customerName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="customer-details">
                                        <div className="customer-name">
                                            {review.customerName}
                                            {review.verified && (
                                                <span className="verified-badge">✓ Verified</span>
                                            )}
                                        </div>
                                        <div className="review-date">
                                            <Calendar size={12} />
                                            {formatDate(review.date)}
                                        </div>
                                    </div>
                                </div>

                                <div className="review-actions">
                                    <button className="action-btn">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="review-content">
                                <div className="review-rating">
                                    {renderStars(review.rating)}
                                </div>
                                <h4 className="review-title">{review.title}</h4>
                                <p className="review-comment">{review.comment}</p>

                                <div className="review-meta">
                                    <div className="helpful-votes">
                                        <button className="helpful-btn">
                                            <ThumbsUp size={14} />
                                            {review.helpful}
                                        </button>
                                        <button className="not-helpful-btn">
                                            <ThumbsDown size={14} />
                                            {review.notHelpful}
                                        </button>
                                    </div>

                                    <button
                                        className={`reply-btn ${review.replied ? 'replied' : 'needs-reply'}`}
                                        onClick={() => handleReply(review)}
                                    >
                                        <MessageCircle size={14} />
                                        {review.replied ? 'Edit Reply' : 'Reply'}
                                    </button>
                                </div>

                                {review.replied && (
                                    <div className="business-reply">
                                        <div className="reply-header">
                                            <strong>Your Reply</strong>
                                            <span className="reply-date">{formatDate(review.replyDate)}</span>
                                        </div>
                                        <p className="reply-text">{review.businessReply}</p>
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
                        <p>No reviews match your current filters.</p>
                    </div>
                )}
            </div>

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
                                    <p>"{selectedReview?.comment}"</p>
                                    <small>- {selectedReview?.customerName}</small>
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
                                    {selectedReview?.replied ? 'Update Reply' : 'Send Reply'}
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
