import React, { useState } from 'react';
import { Star } from 'react-feather';
import './RatingStars.css';

/**
 * Interactive star rating component
 * @param {Object} props Component props
 * @param {number} props.initialRating Initial rating value (1-5)
 * @param {function} props.onRatingChange Callback when rating changes
 * @param {boolean} props.readOnly If true, stars cannot be clicked
 * @param {number} props.size Size of the stars in pixels
 * @param {string} props.activeColor Color of active stars
 * @param {string} props.inactiveColor Color of inactive stars
 * @param {boolean} props.allowHalfStars Allow half-star ratings
 */
function RatingStars({
    initialRating = 0,
    onRatingChange = () => { },
    readOnly = false,
    size = 24,
    activeColor = '#ffc107', // gold/yellow
    inactiveColor = '#e4e5e9', // light gray
    allowHalfStars = false
}) {
    const [rating, setRating] = useState(initialRating);
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (newRating) => {
        if (readOnly) return;

        setRating(newRating);
        onRatingChange(newRating);
    };

    const handleMouseEnter = (hoveredRating) => {
        if (readOnly) return;
        setHoverRating(hoveredRating);
    };

    const handleMouseLeave = () => {
        if (readOnly) return;
        setHoverRating(0);
    };

    // Determine fill percentage for each star
    const getStarFill = (starPosition) => {
        const currentRating = hoverRating || rating;

        if (currentRating >= starPosition) {
            return 100; // Full star
        } else if (allowHalfStars && currentRating > starPosition - 1 && currentRating < starPosition) {
            // Half star - calculate percentage fill
            return (currentRating - Math.floor(currentRating)) * 100;
        } else {
            return 0; // Empty star
        }
    };

    return (
        <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((starPosition) => (
                <div
                    key={starPosition}
                    className={`star-container ${readOnly ? 'read-only' : ''}`}
                    onClick={() => handleClick(starPosition)}
                    onMouseEnter={() => handleMouseEnter(starPosition)}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="star-fill" style={{ width: `${getStarFill(starPosition)}%` }}>
                        <Star
                            size={size}
                            fill={activeColor}
                            stroke={activeColor}
                            strokeWidth={1}
                        />
                    </div>
                    <div className="star-outline">
                        <Star
                            size={size}
                            fill="transparent"
                            stroke={inactiveColor}
                            strokeWidth={1}
                        />
                    </div>
                </div>
            ))}

            {!readOnly && (
                <span className="rating-value">{hoverRating || rating || 0}</span>
            )}
        </div>
    );
}

export default RatingStars;
