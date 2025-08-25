import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, X, MapPin } from "react-feather";

function SignUp({ signupForm, setSignupForm, signupPasswordVisible, togglePasswordVisibility, handleFormSubmit, handleTabChange, handleGoogleSignIn, loading, currentUser, isSuccessfullyLoggedIn }) {
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

    // We'll keep this function but won't use the profile picture
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSignupForm({ ...signupForm, profilePicture: file });
        }
    };

    const isGoogleUser = signupForm.isGoogleUser;

    // Fetch states on component mount
    useEffect(() => {
        fetchStates();

        // Add click event listener to close dropdowns when clicking outside
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle clicks outside the dropdown
    const handleClickOutside = (event) => {
        if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
            setShowStateDropdown(false);
        }
        if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
            setShowCityDropdown(false);
        }
    };

    // Update stateSearchTerm when signupForm.state changes
    useEffect(() => {
        if (signupForm.state) {
            setStateSearchTerm(getStateName(signupForm.state));
        }
    }, [signupForm.state, states]);

    // Update citySearchTerm when signupForm.city changes
    useEffect(() => {
        if (signupForm.city) {
            setCitySearchTerm(getCityName(signupForm.city));
        }
    }, [signupForm.city, cities]);

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
        setSignupForm({
            ...signupForm,
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
        setSignupForm({
            ...signupForm,
            city: cityId,
            cityName: cityName
        });
        setCitySearchTerm(cityName);
        setShowCityDropdown(false);
    };

    return (
        <div className="tab-pane fade show active" id="signup" role="tabpanel" aria-labelledby="signup-tab">
            {isGoogleUser && (
                <div className="alert alert-info mb-3" role="alert">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Complete Your Google Profile:</strong> Please fill in the remaining details to complete your registration.
                </div>
            )}


            <form onSubmit={handleFormSubmit}>
                {/* Scrollable form fields */}
                <div className="form-fields-container">
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email ID</label>
                        <input
                            type="email"
                            className="form-control"
                            id="email"
                            placeholder="Enter Email Id..."
                            value={signupForm.email}
                            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                            required
                            disabled={isGoogleUser} // Disable email field for Google users
                        />
                    </div>
                    <div className="row names mb-3">
                        <div className="firstname col-md-6">
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="firstName"
                                placeholder="Enter First Name..."
                                value={signupForm.firstName}
                                onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="lastName"
                                placeholder="Enter Last Name..."
                                value={signupForm.lastName}
                                onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="phone" className="form-label">
                            Phone Number {isGoogleUser && <span className="text-danger">*</span>}
                        </label>
                        <input
                            type="tel"
                            className="form-control"
                            id="phone"
                            placeholder="Enter Phone Number..."
                            value={signupForm.phone}
                            onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                            required
                        />
                    </div>

                    {/* State Dropdown */}
                    <div className="mb-3">
                        <label htmlFor="state" className="form-label">
                            State {isGoogleUser && <span className="text-danger">*</span>}
                        </label>
                        <div className="dropdown-container" ref={stateDropdownRef}>
                            <div className="search-input-container">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="state"
                                    placeholder="Search and select state..."
                                    value={stateSearchTerm}
                                    onChange={(e) => {
                                        setStateSearchTerm(e.target.value);
                                        setShowStateDropdown(true);
                                    }}
                                    onFocus={() => setShowStateDropdown(true)}
                                />
                                <Search size={16} className="search-icon" />
                                {stateSearchTerm && (
                                    <X
                                        size={16}
                                        className="clear-icon"
                                        onClick={() => {
                                            setStateSearchTerm('');
                                            setSignupForm({ ...signupForm, state: '', stateName: '', city: '', cityName: '' });
                                            setCities([]);
                                        }}
                                    />
                                )}
                            </div>
                            {showStateDropdown && (
                                <div className="dropdown-menu show">
                                    {isLoadingStates ? (
                                        <div className="dropdown-item">Loading states...</div>
                                    ) : filteredStates.length > 0 ? (
                                        filteredStates.map((state) => (
                                            <div
                                                key={state.iso2}
                                                className="dropdown-item"
                                                onClick={() => handleStateSelect(state.iso2, state.name)}
                                            >
                                                {state.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-item">No states found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* City Dropdown */}
                    <div className="mb-3">
                        <label htmlFor="city" className="form-label">
                            City {isGoogleUser && <span className="text-danger">*</span>}
                        </label>
                        <div className="dropdown-container" ref={cityDropdownRef}>
                            <div className="search-input-container">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="city"
                                    placeholder={signupForm.state ? "Search and select city..." : "Please select a state first"}
                                    value={citySearchTerm}
                                    onChange={(e) => {
                                        setCitySearchTerm(e.target.value);
                                        setShowCityDropdown(true);
                                    }}
                                    onFocus={() => signupForm.state && setShowCityDropdown(true)}
                                    disabled={!signupForm.state}
                                />
                                <Search size={16} className="search-icon" />
                                {citySearchTerm && (
                                    <X
                                        size={16}
                                        className="clear-icon"
                                        onClick={() => {
                                            setCitySearchTerm('');
                                            setSignupForm({ ...signupForm, city: '', cityName: '' });
                                        }}
                                    />
                                )}
                            </div>
                            {showCityDropdown && signupForm.state && (
                                <div className="dropdown-menu show">
                                    {isLoadingCities ? (
                                        <div className="dropdown-item">Loading cities...</div>
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
                                        <div className="dropdown-item">No cities found</div>
                                    )}
                                </div>
                            )}
                        </div>
                        {!signupForm.state && (
                            <small className="text-muted">Please select a state first</small>
                        )}
                    </div>

                    {/* Address Field */}
                    <div className="mb-3">
                        <label htmlFor="address" className="form-label">
                            <MapPin size={16} className="me-2" />
                            Address (Optional)
                        </label>
                        <textarea
                            className="form-control"
                            id="address"
                            rows="2"
                            placeholder="Enter your complete address..."
                            value={signupForm.address || ''}
                            onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                        />
                    </div>

                    {/* Only show password field for new users (not Google users or existing users completing profile) */}
                    {!isGoogleUser && (
                        <div className="mb-3 position-relative">
                            <label htmlFor="signupPassword" className="form-label">Password</label>
                            <div className="form-control d-flex align-items-center justify-content-between">
                                <input
                                    type={signupPasswordVisible ? "text" : "password"}
                                    id="signupPassword"
                                    placeholder="Enter Password..."
                                    value={signupForm.password}
                                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                    required
                                />
                                <span id="showPassSignup" onClick={togglePasswordVisibility}>
                                    <i className={`fas ${signupPasswordVisible ? "fa-eye-slash" : "fa-eye"}`} id="SignuptogglePasswordIcon"></i>
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed buttons section */}
                <div className="below-btns">
                    {isSuccessfullyLoggedIn ? (
                        <Link to="/dashboard" className="btn regBtn">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <button type="submit" className="btn regBtn" disabled={loading}>
                            {loading ?
                                (isGoogleUser ? 'Completing Profile...' : 'Registering...') :
                                (isGoogleUser ? 'Complete Profile' : 'Register')
                            }
                        </button>
                    )}
                    <p className="mt-3 mb-0">
                        Already have an account?
                        <a href="#" className="mt-0 anc-link" id="toggleToSignin" onClick={() => handleTabChange("signin")}>Sign In</a>
                    </p>
                    <p className="mt-2 mb-0">
                        Are you a business owner?
                        <a href="/business-login" className="mt-0 anc-link">Business Register/Login</a>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default SignUp;