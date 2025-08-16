import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'react-feather';
import RatingStars from './RatingStars';
import './ReviewForm.css';

/**
 * Component for users to create or edit reviews
 * @param {Object} props Component props
 * @param {Object} props.initialReview Initial review data for editing (null for new review)
 * @param {function} props.onSubmit Callback when the form is submitted
 * @param {function} props.onCancel Callback when the form is cancelled
 * @param {string} props.entityName Name of the entity being reviewed
 * @param {string} props.entityType Type of entity ("business", "product", "service")
 */
function ReviewForm({
    initialReview = null,
    onSubmit,
    onCancel,
    entityName = '',
    entityType = 'business'
}) {
    const [rating, setRating] = useState(initialReview?.rating || 0);
    const [comment, setComment] = useState(initialReview?.comment || '');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const isEditMode = !!initialReview;

    useEffect(() => {
        // Reset success state when form changes
        if (isSuccess) {
            setIsSuccess(false);
        }
    }, [rating, comment]);

    const handleRatingChange = (newRating) => {
        setRating(newRating);
        if (error) setError('');
    };

    const handleCommentChange = (e) => {
        setComment(e.target.value);
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (rating < 1) {
            setError('Please select a rating');
            return;
        }

        if (!comment.trim()) {
            setError('Please write a review comment');
            return;
        }

        try {
            setIsSubmitting(true);

            // Create review data object
            const reviewData = {
                rating,
                comment: comment.trim()
            };

            // Call the onSubmit callback
            await onSubmit(reviewData);

            // Show success message
            setIsSuccess(true);

            // Reset form if not editing
            if (!isEditMode) {
                setRating(0);
                setComment('');
            }

            // Auto-close after success
            if (!isEditMode) {
                setTimeout(() => {
                    onCancel();
                }, 2000);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            setError(error.message || 'Error submitting review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="review-form-container">
            <form className="review-form" onSubmit={handleSubmit}>
                <h3 className="form-title">
                    {isEditMode ? 'Edit Your Review' : `Review ${entityType === 'business' ? 'this business' : 'this ' + entityType}`}
                </h3>

                {entityName && (
                    <p className="entity-name">{entityName}</p>
                )}

                <div className="rating-field">
                    <span>Your Rating</span>
                    <RatingStars
                        initialRating={rating}
                        onRatingChange={handleRatingChange}
                        size={28}
                    />
                </div>

                <div className="comment-field">
                    <label htmlFor="reviewComment">Your Review</label>
                    <textarea
                        id="reviewComment"
                        value={comment}
                        onChange={handleCommentChange}
                        placeholder={`Share your experience with this ${entityType}...`}
                        rows={4}
                        maxLength={1000}
                    />
                    <div className="character-count">
                        {comment.length}/1000 characters
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {isSuccess && (
                    <div className="success-message">
                        <Check size={16} />
                        <span>
                            {isEditMode
                                ? 'Your review has been updated!'
                                : 'Your review has been submitted!'}
                        </span>
                    </div>
                )}

                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={isSubmitting || rating < 1 || !comment.trim()}
                    >
                        {isSubmitting
                            ? 'Submitting...'
                            : isEditMode
                                ? 'Update Review'
                                : 'Submit Review'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ReviewForm;
