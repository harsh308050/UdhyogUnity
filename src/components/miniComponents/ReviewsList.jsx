import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Filter, RefreshCw } from 'react-feather';
import ReviewCard from './ReviewCard';
import './ReviewsList.css';

/**
 * Component to display a list of reviews with filtering and sorting options
 * @param {Object} props Component props
 * @param {Array} props.reviews Array of review objects
 * @param {boolean} props.loading Whether reviews are currently loading
 * @param {function} props.onLoadMore Callback to load more reviews (pagination)
 * @param {boolean} props.hasMoreReviews Whether there are more reviews to load
 * @param {boolean} props.isBusinessOwner Whether current user is business owner
 * @param {function} props.onReply Callback when business owner replies to a review
 * @param {function} props.onEdit Callback when author edits their review
 * @param {function} props.onDelete Callback when author deletes their review
 * @param {function} props.onReport Callback when a user reports a review
 * @param {function} props.checkIsReviewAuthor Function to check if current user is author of a review
 */
function ReviewsList({
    reviews = [],
    loading = false,
    onLoadMore,
    hasMoreReviews = false,
    isBusinessOwner = false,
    onReply = () => { },
    onEdit = () => { },
    onDelete = () => { },
    onReport = () => { },
    checkIsReviewAuthor = () => false,
    stats = null
}) {
    const [sortOption, setSortOption] = useState('newest');
    const [filterOption, setFilterOption] = useState('all');
    const [displayedReviews, setDisplayedReviews] = useState([]);

    // Apply sorting and filtering to reviews
    useEffect(() => {
        if (!reviews.length) {
            setDisplayedReviews([]);
            return;
        }

        let filteredReviews = [...reviews];

        // Apply rating filter
        if (filterOption !== 'all') {
            const rating = parseInt(filterOption);
            filteredReviews = filteredReviews.filter(review =>
                Math.floor(review.rating) === rating
            );
        }

        // Apply sorting
        if (sortOption === 'newest') {
            filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortOption === 'oldest') {
            filteredReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortOption === 'highest') {
            filteredReviews.sort((a, b) => b.rating - a.rating);
        } else if (sortOption === 'lowest') {
            filteredReviews.sort((a, b) => a.rating - b.rating);
        }

        setDisplayedReviews(filteredReviews);
    }, [reviews, sortOption, filterOption]);

    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    const handleFilterChange = (e) => {
        setFilterOption(e.target.value);
    };

    // Render the review stats summary if provided
    const renderStats = () => {
        if (!stats) return null;

        return (
            <div className="reviews-summary">
                <div className="summary-rating">
                    <div className="average-rating">
                        <h3>{stats.averageRating.toFixed(1)}</h3>
                        <div className="rating-stars-summary">
                            <Star size={14} fill="#ffc107" stroke="#ffc107" />
                            <Star size={14} fill={stats.averageRating >= 2 ? "#ffc107" : "none"} stroke="#ffc107" />
                            <Star size={14} fill={stats.averageRating >= 3 ? "#ffc107" : "none"} stroke="#ffc107" />
                            <Star size={14} fill={stats.averageRating >= 4 ? "#ffc107" : "none"} stroke="#ffc107" />
                            <Star size={14} fill={stats.averageRating >= 5 ? "#ffc107" : "none"} stroke="#ffc107" />
                        </div>
                        <span className="total-reviews">{stats.reviewCount} reviews</span>
                    </div>
                </div>

                <div className="rating-bars">
                    {[5, 4, 3, 2, 1].map(rating => (
                        <div className="rating-bar-container" key={rating}>
                            <div className="rating-label">
                                {rating} <Star size={12} fill="#ffc107" stroke="#ffc107" />
                            </div>
                            <div className="rating-bar-wrapper">
                                <div
                                    className="rating-bar-fill"
                                    style={{ width: `${stats.ratingPercentages[rating]}%` }}
                                ></div>
                            </div>
                            <div className="rating-count">
                                {stats.ratingCounts[rating]}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="reviews-list-container">
            {/* Review stats */}
            {renderStats()}

            {/* Filters and sorting */}
            <div className="reviews-controls">
                <div className="sort-options">
                    <label htmlFor="filter-select">
                        <Filter size={14} />
                        <span>Filter:</span>
                    </label>
                    <select
                        id="filter-select"
                        className="sort-select"
                        value={filterOption}
                        onChange={handleFilterChange}
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>

                <div className="sort-options">
                    <label htmlFor="sort-select">
                        <span>Sort by:</span>
                    </label>
                    <select
                        id="sort-select"
                        value={sortOption}
                        onChange={handleSortChange}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                    </select>
                </div>
            </div>

            {/* Review count */}
            <div className="reviews-count">
                <MessageSquare size={16} />
                <span>
                    {displayedReviews.length}
                    {filterOption !== 'all' ? ` ${filterOption}-star` : ''}
                    {displayedReviews.length === 1 ? ' review' : ' reviews'}
                </span>
            </div>

            {/* Reviews list */}
            {loading && reviews.length === 0 ? (
                <div className="loading-reviews">
                    <div className="loading-spinner"></div>
                    <p>Loading reviews...</p>
                </div>
            ) : displayedReviews.length > 0 ? (
                <div className="reviews-list">
                    {displayedReviews.map(review => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            isBusinessOwner={isBusinessOwner}
                            isReviewAuthor={checkIsReviewAuthor(review)}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onReport={onReport}
                        />
                    ))}

                    {/* Load more button */}
                    {hasMoreReviews && (
                        <div className="load-more-container">
                            <button
                                className="load-more-button"
                                onClick={onLoadMore}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={14} className="loading-icon" />
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <span>Load More Reviews</span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="no-reviews">
                    <MessageSquare size={36} />
                    <h3>No Reviews Yet</h3>
                    <p>
                        {filterOption !== 'all'
                            ? `There are no ${filterOption}-star reviews yet.`
                            : 'Be the first to leave a review!'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default ReviewsList;
