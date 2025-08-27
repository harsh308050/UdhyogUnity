import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from "framer-motion";
import "./ProfileCompletionModal.css";

function UserProfileCompletionModal({
    show,
    onClose,
    userData,
    setUserData,
    onSubmit,
    loading,
    error
}) {
    // State and city dropdown management
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [stateSearchTerm, setStateSearchTerm] = useState('');
    const [citySearchTerm, setCitySearchTerm] = useState('');
    const [showStateDropdown, setShowStateDropdown] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    // Refs for dropdowns
    const stateDropdownRef = useRef(null);
    const cityDropdownRef = useRef(null);

    // Fetch states
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
            }
        } catch (error) {
            console.error('Error fetching states:', error);
        } finally {
            setIsLoadingStates(false);
        }
    };

    // Fetch cities
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
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setCities([]);
        } finally {
            setIsLoadingCities(false);
        }
    };

    // Find state name by code
    const getStateName = useCallback((stateCode) => {
        const state = states.find(s => s.iso2 === stateCode);
        return state ? state.name : '';
    }, [states]);

    // Find city name by id
    const getCityName = useCallback((cityId) => {
        const city = cities.find(c => c.id === cityId);
        return city ? city.name : '';
    }, [cities]);

    // Handle state selection
    const handleStateSelect = (stateCode, stateName) => {
        setUserData({
            ...userData,
            state: stateCode,
            stateName: stateName,
            city: '',
            cityName: ''
        });
        setStateSearchTerm(stateName);
        setShowStateDropdown(false);
        setCities([]);
        fetchCities(stateCode);
    };

    // Handle city selection
    const handleCitySelect = (cityId, cityName) => {
        setUserData({
            ...userData,
            city: cityId,
            cityName: cityName
        });
        setCitySearchTerm(cityName);
        setShowCityDropdown(false);
    };

    // Handle clicks outside dropdowns
    const handleClickOutside = (event) => {
        if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
            setShowStateDropdown(false);
        }
        if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
            setShowCityDropdown(false);
        }
    };

    // Initialize dropdowns when modal is shown
    useEffect(() => {
        if (show) {
            fetchStates();

            // Add click event listener for dropdowns
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [show]);

    // Update search terms when userData changes
    useEffect(() => {
        if (userData.state) {
            setStateSearchTerm(getStateName(userData.state));
        }
    }, [userData.state, states, getStateName]);

    useEffect(() => {
        if (userData.city) {
            setCitySearchTerm(getCityName(userData.city));
        }
    }, [userData.city, cities, getCityName]);

    if (!show) return null;

    return (
        <motion.div
            className="profile-completion-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="modal-container"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <form onSubmit={onSubmit}>
                    <div className="modal-header">
                        <h5 className="modal-title">Complete Your Profile</h5>
                    </div>
                    <div className="modal-body">
                        <p className="mb-3">
                            Please provide the following information to complete your registration:
                        </p>

                        {/* State Dropdown */}
                        <div className="mb-3">
                            <label className="form-label">State <span className="text-danger">*</span></label>
                            <div className="dropdown-container" ref={stateDropdownRef}>
                                <div className="search-input-container">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search and select state..."
                                        value={stateSearchTerm}
                                        onChange={(e) => {
                                            setStateSearchTerm(e.target.value);
                                            setShowStateDropdown(true);
                                        }}
                                        onFocus={() => setShowStateDropdown(true)}
                                        required
                                    />
                                    {stateSearchTerm && (
                                        <span
                                            className="clear-icon"
                                            onClick={() => {
                                                setStateSearchTerm('');
                                                setUserData({
                                                    ...userData,
                                                    state: '',
                                                    stateName: '',
                                                    city: '',
                                                    cityName: ''
                                                });
                                                setCities([]);
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                position: 'absolute',
                                                right: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                        >
                                            ✕
                                        </span>
                                    )}
                                </div>
                                {showStateDropdown && (
                                    <div className="dropdown-menu show">
                                        {isLoadingStates ? (
                                            <div className="dropdown-item">Loading states...</div>
                                        ) : states.filter(state =>
                                            state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                            states.filter(state =>
                                                state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
                                            ).map((state) => (
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
                            <label className="form-label">City <span className="text-danger">*</span></label>
                            <div className="dropdown-container" ref={cityDropdownRef}>
                                <div className="search-input-container">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={userData.state ? "Search and select city..." : "Please select a state first"}
                                        value={citySearchTerm}
                                        onChange={(e) => {
                                            setCitySearchTerm(e.target.value);
                                            setShowCityDropdown(true);
                                        }}
                                        onFocus={() => userData.state && setShowCityDropdown(true)}
                                        disabled={!userData.state}
                                        required
                                    />
                                    {citySearchTerm && (
                                        <span
                                            className="clear-icon"
                                            onClick={() => {
                                                setCitySearchTerm('');
                                                setUserData({
                                                    ...userData,
                                                    city: '',
                                                    cityName: ''
                                                });
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                position: 'absolute',
                                                right: '15px',
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                        >
                                            ✕
                                        </span>
                                    )}
                                </div>
                                {showCityDropdown && userData.state && (
                                    <div className="dropdown-menu show">
                                        {isLoadingCities ? (
                                            <div className="dropdown-item">Loading cities...</div>
                                        ) : cities.filter(city =>
                                            city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                            cities.filter(city =>
                                                city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
                                            ).map((city) => (
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
                            {!userData.state && (
                                <small className="text-muted">Please select a state first</small>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div className="mb-3">
                            <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                            <input
                                type="tel"
                                className="form-control"
                                value={userData.phone}
                                onChange={e => setUserData({ ...userData, phone: e.target.value })}
                                required
                                placeholder="Enter your phone number"
                            />
                        </div>
                        {error && <div className="alert alert-danger">{error}</div>}
                    </div>
                    <div className="modal-footer">
                        <span><button
                            type="button"
                            className="btn-outline-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button></span>
                        <span><button
                            type="submit"
                            className="regBtn"
                            disabled={loading || !userData.city || !userData.phone || !userData.state}
                        >
                            {loading ? 'Processing...' : 'Continue'}
                        </button></span>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

export default UserProfileCompletionModal;
