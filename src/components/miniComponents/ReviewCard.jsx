import React, { useState } from 'react';
import { MessageSquare, User, ThumbsUp, Flag, MoreVertical, Clock, Check } from 'react-feather';
import RatingStars from './RatingStars';
import './ReviewCard.css';

/**
 * Component to display a single review
 * @param {Object} props Component props
 * @param {Object} props.review The review data
 * @param {boolean} props.isBusinessOwner Whether the current user is the business owner
 * @param {boolean} props.isReviewAuthor Whether the current user is the author of the review
 * @param {function} props.onReply Callback when business owner replies to a review
 * @param {function} props.onEdit Callback when author edits their review
 * @param {function} props.onDelete Callback when author deletes their review
 * @param {function} props.onReport Callback when a user reports a review
 */
function ReviewCard({
    review,
    isBusinessOwner = false,
    isReviewAuthor = false,
    onReply = () => { },
    onEdit = () => { },
    onDelete = () => { },
    onReport = () => { }
}) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showOptions, setShowOptions] = useState(false);

    // Format date for display
    const formatDate = (date) => {
        if (!date) return 'Unknown date';

        const dateObj = date instanceof Date ? date : new Date(date);

        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Handle business owner reply submission
    const handleReplySubmit = () => {
        if (!replyText.trim()) return;

        onReply(review.id, replyText);
        setReplyText('');
        setShowReplyForm(false);
    };

    // Toggle reply form visibility
    const toggleReplyForm = () => {
        setShowReplyForm(!showReplyForm);
        if (!showReplyForm) {
            setReplyText(review.businessResponse?.text || '');
        }
    };

    // Toggle options menu
    const toggleOptions = () => {
        setShowOptions(!showOptions);
    };

    return (
        <div className="review-card">
            <div className="review-header">
                <div className="review-author">
                    {review.userPhotoURL ? (
                        <img
                            src={review.userPhotoURL}
                            alt={review.userName}
                            className="author-avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '../../assets/empty-box.svg';
                            }}
                        />
                    ) : (
                        <div className="author-avatar-placeholder">
                            <User size={18} />
                        </div>
                    )}
                    <div className="author-info">
                        <h4 className="author-name">{review.userName}</h4>
                        <span className="review-date">{formatDate(review.createdAt)}</span>
                    </div>
                </div>

                <div className="review-rating">
                    <RatingStars initialRating={review.rating} readOnly size={16} />
                </div>

                {/* Options menu */}
                {(isBusinessOwner || isReviewAuthor) && (
                    <div className="review-options">
                        <button className="options-button" onClick={toggleOptions}>
                            <MoreVertical size={16} />
                        </button>

                        {showOptions && (
                            <div className="options-menu">
                                {isBusinessOwner && !review.businessResponse && (
                                    <button onClick={toggleReplyForm}>Reply to review</button>
                                )}

                                {isBusinessOwner && review.businessResponse && (
                                    <button onClick={toggleReplyForm}>Edit your reply</button>
                                )}

                                {isReviewAuthor && (
                                    <>
                                        <button onClick={() => onEdit(review)}>Edit review</button>
                                        <button
                                            className="delete-option"
                                            onClick={() => onDelete(review.id)}
                                        >
                                            Delete review
                                        </button>
                                    </>
                                )}

                                {!isBusinessOwner && !isReviewAuthor && (
                                    <button onClick={() => onReport(review.id)}>Report review</button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="review-content">
                <p>{review.comment}</p>
            </div>

            {/* Business response */}
            {review.businessResponse && (
                <div className="business-response">
                    <div className="response-header">
                        <div className="business-info">
                            <Check size={14} className="business-verified-icon" />
                            <span className="business-label">Business Response</span>
                            <span className="response-date">
                                {formatDate(review.businessResponse.createdAt)}
                            </span>
                        </div>
                    </div>
                    <p className="response-text">{review.businessResponse.text}</p>
                </div>
            )}

            {/* Reply form for business owners */}
            {isBusinessOwner && showReplyForm && (
                <div className="reply-form">
                    <h5>
                        {review.businessResponse ? 'Edit your response' : 'Respond to this review'}
                    </h5>
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your response to this review..."
                        rows={3}
                    />
                    <div className="reply-actions">
                        <button className="cancel-button" onClick={toggleReplyForm}>
                            Cancel
                        </button>
                        <button
                            className="submit-button"
                            onClick={handleReplySubmit}
                            disabled={!replyText.trim()}
                        >
                            {review.businessResponse ? 'Update Response' : 'Post Response'}
                        </button>
                    </div>
                </div>
            )}

            {/* Review actions */}
            <div className="review-actions">
                {isBusinessOwner && !showReplyForm && !review.businessResponse && (
                    <button className="action-button reply-button" onClick={toggleReplyForm}>
                        <MessageSquare size={14} />
                        <span>Reply</span>
                    </button>
                )}

                {!isBusinessOwner && !isReviewAuthor && (
                    <button className="action-button report-button" onClick={() => onReport(review.id)}>
                        <Flag size={14} />
                        <span>Report</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ReviewCard;
