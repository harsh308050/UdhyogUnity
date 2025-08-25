import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, Save, Upload, Search, X, ChevronDown } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { updateUserInFirestore } from '../../Firebase/db';
import { uploadToCloudinary } from '../../Firebase/cloudinary';
import './UserProfileSettings.css';

function UserProfileSettings() {
    const { currentUser, userDetails } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        city: '',
        cityName: '',
        state: '',
        stateName: '',
        address: '',
        photoURL: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [previewImage, setPreviewImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imageUploadKey, setImageUploadKey] = useState(0); // Force re-render key

    // State and city dropdown management
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    // Search functionality
    const [stateSearchTerm, setStateSearchTerm] = useState('');
    const [citySearchTerm, setCitySearchTerm] = useState('');
    const [showStateDropdown, setShowStateDropdown] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    // Refs for clickaway detection
    const stateDropdownRef = useRef(null);
    const cityDropdownRef = useRef(null);

    useEffect(() => {
        if (userDetails) {
            // Process photoURL - handle if it's an object with URL property
            let photoURL = userDetails.photoURL || '';
            if (photoURL && typeof photoURL === 'object') {
                console.log("photoURL is an object in UserProfileSettings:", photoURL);
                photoURL = photoURL.url || photoURL.toString() || '';
            }

            setFormData({
                firstName: userDetails.firstName || '',
                lastName: userDetails.lastName || '',
                email: userDetails.email || currentUser?.email || '',
                phone: userDetails.phone || '',
                city: userDetails.city || '',
                cityName: userDetails.cityName || '',
                state: userDetails.state || '',
                stateName: userDetails.stateName || '',
                address: userDetails.address || '',
                photoURL: userDetails.photoURL || ''
            });

            // Initialize search terms with existing data
            if (userDetails.stateName) {
                setStateSearchTerm(userDetails.stateName);
            }
            if (userDetails.cityName) {
                setCitySearchTerm(userDetails.cityName);
            }

            if (photoURL) {
                console.log("Setting preview image:", photoURL);
                setPreviewImage(photoURL);
            }
        }
    }, [userDetails, currentUser]);

    // Initialize dropdowns and add event listeners
    useEffect(() => {
        fetchStates();

        // Add click event listener to close dropdowns when clicking outside
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debug logging
    useEffect(() => {
        console.log("UserProfileSettings State Debug:", {
            showStateDropdown,
            showCityDropdown,
            stateSearchTerm,
            citySearchTerm,
            statesLength: states.length,
            citiesLength: cities.length,
            isLoadingStates,
            isLoadingCities,
            filteredStatesLength: states.filter(state =>
                state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
            ).length
        });
    }, [showStateDropdown, showCityDropdown, stateSearchTerm, citySearchTerm, states, cities, isLoadingStates, isLoadingCities]);

    // Handle clicks outside the dropdown
    const handleClickOutside = (event) => {
        if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
            setShowStateDropdown(false);
        }
        if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
            setShowCityDropdown(false);
        }
    };

    // Update search terms when form data changes
    useEffect(() => {
        if (formData.state && states.length > 0) {
            // If we have stateName, use it; otherwise, get it from state code
            const displayName = formData.stateName || getStateName(formData.state);
            if (displayName && stateSearchTerm !== displayName) {
                setStateSearchTerm(displayName);
            }
        }
    }, [formData.state, formData.stateName, states]);

    useEffect(() => {
        if (formData.city && cities.length > 0) {
            // If we have cityName, use it; otherwise, get it from city ID
            const displayName = formData.cityName || getCityName(formData.city);
            if (displayName && citySearchTerm !== displayName) {
                setCitySearchTerm(displayName);
            }
        }
    }, [formData.city, formData.cityName, cities]);

    // Fetch states from API
    const fetchStates = async () => {
        setIsLoadingStates(true);
        try {
            const response = await fetch('https://api.countrystatecity.in/v1/countries/IN/states', {
                headers: {
                    'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ=='
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStates(data);
            } else {
                console.error('Failed to fetch states');
            }
        } catch (error) {
            console.error('Error fetching states:', error);
        } finally {
            setIsLoadingStates(false);
        }
    };

    // Fetch cities from API based on state
    const fetchCities = async (stateCode) => {
        setIsLoadingCities(true);
        try {
            const response = await fetch(`https://api.countrystatecity.in/v1/countries/IN/states/${stateCode}/cities`, {
                headers: {
                    'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ=='
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCities(data);
            } else {
                console.error('Failed to fetch cities');
                setCities([]);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setCities([]);
        } finally {
            setIsLoadingCities(false);
        }
    };

    // Filter states based on search term
    const filteredStates = states.filter(state =>
        state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
    );

    // Filter cities based on search term
    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
    );

    // Find state name by code
    const getStateName = (stateCode) => {
        const state = states.find(s => s.iso2 === stateCode);
        return state ? state.name : '';
    };

    // Find city name by id
    const getCityName = (cityId) => {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : '';
    };

    // Handle state selection
    const handleStateSelect = (stateCode, stateName) => {
        setFormData({
            ...formData,
            state: stateCode,
            stateName: stateName,
            city: '', // Reset city when state changes
            cityName: ''
        });
        setStateSearchTerm(stateName);
        setShowStateDropdown(false);
        setCities([]); // Clear cities
        fetchCities(stateCode); // Fetch new cities
    };

    // Handle city selection
    const handleCitySelect = (cityId, cityName) => {
        setFormData({
            ...formData,
            city: cityId,
            cityName: cityName
        });
        setCitySearchTerm(cityName);
        setShowCityDropdown(false);
    };

    // Initialize cities if state is already selected
    useEffect(() => {
        if (formData.state && states.length > 0) {
            // Only fetch cities if we don't have them yet or if state changed
            if (cities.length === 0 || !cities.some(city => city.id == formData.city)) {
                fetchCities(formData.state);
            }
        }
    }, [formData.state, states]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setMessage({
                    text: "Please select a valid image file.",
                    type: "error"
                });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setMessage({
                    text: "Image size should be less than 5MB.",
                    type: "error"
                });
                return;
            }

            setImageFile(file);
            setMessage({ text: '', type: '' }); // Clear any previous messages

            // Create preview
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreviewImage(event.target.result);
            };
            reader.onerror = () => {
                setMessage({
                    text: "Error reading image file.",
                    type: "error"
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfileImage = async () => {
        if (!imageFile) return null;

        try {
            console.log("Uploading profile image to Cloudinary for user:", currentUser.email);

            // Use the user's email with timestamp as the public_id for the profile image
            // Replace @ and . with _ to make it valid for Cloudinary
            const sanitizedEmail = currentUser.email.replace(/[@.]/g, '_');
            const timestamp = Date.now();
            const folder = 'profile_images';
            const uniquePublicId = `${sanitizedEmail}_${timestamp}`;

            const result = await uploadToCloudinary(
                imageFile,
                folder,
                uniquePublicId
            );

            console.log("Profile image uploaded successfully:", result);

            // Add cache-busting parameter to ensure fresh image load
            const imageUrlWithCacheBust = `${result.url}?t=${timestamp}`;

            return imageUrlWithCacheBust;
        } catch (error) {
            console.error("Error uploading profile image:", error);
            setMessage({
                text: "Failed to upload profile image. Please try again.",
                type: "error"
            });
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            let photoURL = formData.photoURL;

            // Upload new image if selected
            if (imageFile) {
                setMessage({
                    text: "Uploading profile image...",
                    type: "info"
                });

                const uploadedImageURL = await uploadProfileImage();
                if (uploadedImageURL) {
                    photoURL = uploadedImageURL;
                    console.log("New profile image URL:", photoURL);
                } else {
                    // If upload failed, don't continue with the update
                    return;
                }
            }

            setMessage({
                text: "Updating profile...",
                type: "info"
            });

            // Update user data in Firestore
            const success = await updateUserInFirestore(formData.email, {
                ...formData,
                photoURL
            });

            if (success) {
                setMessage({
                    text: "Profile updated successfully!",
                    type: "success"
                });

                // Update local form data with new photo URL
                if (photoURL !== formData.photoURL) {
                    setFormData(prev => ({
                        ...prev,
                        photoURL
                    }));

                    // Force update the preview image with cache-busting
                    setPreviewImage(photoURL);

                    // Force re-render by updating the key
                    setImageUploadKey(prev => prev + 1);

                    // Also trigger a re-render by updating the image src
                    setTimeout(() => {
                        const img = document.querySelector('.profile-preview');
                        if (img) {
                            img.src = photoURL;
                        }
                    }, 100);
                }

                // Clear the file input
                setImageFile(null);

                // Clear the file input element
                const fileInput = document.getElementById('profile-upload');
                if (fileInput) {
                    fileInput.value = '';
                }
            } else {
                setMessage({
                    text: "Failed to update profile. Please try again.",
                    type: "error"
                });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({
                text: "An error occurred while updating your profile.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="user-profile-settings">
            <h2>Profile Settings</h2>

            <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-image-section">
                    <div className="profile-image-container">
                        {previewImage ? (
                            <img
                                key={`${previewImage}-${imageUploadKey}`} // Force re-render when URL or key changes
                                src={previewImage}
                                alt="Profile Preview"
                                className="profile-preview"
                                onError={(e) => {
                                    console.error("Error loading profile preview image:", e);
                                    setPreviewImage(null);
                                }}
                                onLoad={() => {
                                    console.log("Profile image loaded successfully:", previewImage);
                                }}
                            />
                        ) : (
                            <div className="profile-placeholder">
                                {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}

                        <label htmlFor="profile-upload" className="upload-button">
                            <Upload size={18} />
                            <span>Upload</span>
                            <input
                                type="file"
                                id="profile-upload"
                                accept="image/*"
                                onChange={handleImageChange}
                                hidden
                            />
                        </label>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName">
                            <User size={16} />
                            <span>First Name</span>
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="Your first name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="lastName">
                            <User size={16} />
                            <span>Last Name</span>
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Your last name"
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="email">
                        <Mail size={16} />
                        <span>Email</span>
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        readOnly
                        disabled
                        className="readonly-input"
                    />
                    <small>Email cannot be changed</small>
                </div>

                <div className="form-group">
                    <label htmlFor="phone">
                        <Phone size={16} />
                        <span>Phone Number</span>
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Your phone number"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="state">
                            <MapPin size={16} />
                            <span>State</span>
                        </label>
                        <div className="dropdown-container" ref={stateDropdownRef}>
                            <div
                                className={`dropdown-input ${showStateDropdown ? 'open' : ''}`}
                                onClick={() => {
                                    console.log("State dropdown clicked, current state:", showStateDropdown);
                                    setShowStateDropdown(!showStateDropdown);
                                }}
                            >
                                <input
                                    type="text"
                                    value={stateSearchTerm}
                                    onChange={(e) => {
                                        setStateSearchTerm(e.target.value);
                                        setShowStateDropdown(true);
                                    }}
                                    onFocus={() => setShowStateDropdown(true)}
                                    placeholder="Search and select state"
                                    autoComplete="off"
                                />
                                <ChevronDown size={16} className="dropdown-icon" />
                            </div>

                            {showStateDropdown && (
                                <div className="dropdown-menu" style={{ backgroundColor: '#2a3f5f', color: 'white', zIndex: 9999 }}>
                                    {isLoadingStates ? (
                                        <div className="dropdown-item loading">Loading states...</div>
                                    ) : filteredStates.length > 0 ? (
                                        <>
                                            <div className="dropdown-item" style={{ color: 'yellow', fontWeight: 'bold' }}>
                                                Found {filteredStates.length} states
                                            </div>
                                            {filteredStates.map((state) => (
                                                <div
                                                    key={state.iso2}
                                                    className="dropdown-item"
                                                    onClick={() => handleStateSelect(state.iso2, state.name)}
                                                >
                                                    {state.name}
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="dropdown-item no-results">No states found (search: "{stateSearchTerm}")</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="city">
                            <MapPin size={16} />
                            <span>City</span>
                        </label>
                        <div className="dropdown-container" ref={cityDropdownRef}>
                            <div
                                className={`dropdown-input ${showCityDropdown ? 'open' : ''}`}
                                onClick={() => formData.state && setShowCityDropdown(!showCityDropdown)}
                            >
                                <input
                                    type="text"
                                    value={citySearchTerm}
                                    onChange={(e) => {
                                        setCitySearchTerm(e.target.value);
                                        if (formData.state) {
                                            setShowCityDropdown(true);
                                        }
                                    }}
                                    onFocus={() => formData.state && setShowCityDropdown(true)}
                                    placeholder={formData.state ? "Search and select city" : "Please select state first"}
                                    autoComplete="off"
                                    disabled={!formData.state}
                                />
                                <ChevronDown size={16} className="dropdown-icon" />
                            </div>

                            {showCityDropdown && formData.state && (
                                <div className="dropdown-menu">
                                    {isLoadingCities ? (
                                        <div className="dropdown-item loading">Loading cities...</div>
                                    ) : filteredCities.length > 0 ? (
                                        filteredCities.map((city) => (
                                            <div
                                                key={city.id}
                                                className="dropdown-item"
                                                onClick={() => handleCitySelect(city.id, city.name)}
                                            >
                                                {city.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-item no-results">No cities found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="address">
                        <MapPin size={16} />
                        <span>Address</span>
                    </label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Your full address"
                    />
                </div>

                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn-primary save-profile"
                        disabled={loading}
                    >
                        <Save size={18} />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default UserProfileSettings;
