import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, Mail, User, ArrowLeft, ArrowRight, Navigation, Search, X, MapPin } from 'lucide-react';
import L from 'leaflet';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../Firebase/db';
import { initializeRecaptcha, sendOTPToPhone } from '../../../Firebase/businessAuth';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Map position handler component
const MapPositionHandler = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return null;
};

// Marker click handler component
const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleClick = (e) => {
      onMapClick(e.latlng);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);

  return null;
};

const ContactLocationForm = ({ formData, updateFormData, onNext, onPrevious }) => {
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Country State City data
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [locationFound, setLocationFound] = useState(false);

  // Search functionality
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Refs for clickaway detection
  const stateDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);

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

  // Update stateSearchTerm when formData.state changes
  useEffect(() => {
    if (formData.state) {
      setStateSearchTerm(getStateName(formData.state));
    }
  }, [formData.state, states]);

  // Update citySearchTerm when formData.city changes
  useEffect(() => {
    if (formData.city) {
      setCitySearchTerm(getCityName(formData.city));
    }
  }, [formData.city, cities]);

  // Fetch states from API
  const fetchStates = async () => {
    setIsLoadingStates(true);
    try {
      const response = await fetch('https://api.countrystatecity.in/v1/countries/IN/states', {
        headers: {
          'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ==' // Replace with your API key
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
          'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ==' // Replace with your API key
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCities(data);
      } else {
        console.error('Failed to fetch cities');
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setIsLoadingCities(false);
    }
  };

  // Get state and city from coordinates using Nominatim
  const getLocationDetails = async (lat, lng) => {
    try {
      // Add headers to comply with Nominatim usage policy
      const headers = {
        'Accept-Language': 'en',
        'User-Agent': 'UdhyogUnity/1.0', // Application name and version
        'Referrer': window.location.href
      };

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&countrycodes=in`,
        {
          headers: headers
        }
      );

      const data = await response.json();

      if (data) {
        let stateComponent = null;
        let cityComponent = null;

        // Extract state and city from address components
        if (data.address) {
          stateComponent = data.address.state;
          cityComponent = data.address.city || data.address.town || data.address.village;

          // Log address details for debugging
          console.log("Address details:", data.address);
        }

        // Find matching state in our states list
        if (stateComponent) {
          const matchedState = states.find(state =>
            state.name.toLowerCase() === stateComponent.toLowerCase()
          );

          if (matchedState) {
            updateFormData({
              state: matchedState.iso2,
              stateName: matchedState.name
            });

            // Wait for cities to load then select the matching city
            setTimeout(() => {
              if (cityComponent) {
                const matchedCity = cities.find(city =>
                  city.name.toLowerCase() === cityComponent.toLowerCase()
                );

                if (matchedCity) {
                  updateFormData({
                    city: matchedCity.id,
                    cityName: matchedCity.name
                  });
                }
              }
            }, 1000);
          }
        }        // Format a better address including house number if available
        let formattedAddress = '';
        if (data.address) {
          const addr = data.address;
          const addressParts = [];

          // Add house number and road if available
          if (addr.house_number) addressParts.push(addr.house_number);
          if (addr.road) addressParts.push(addr.road);

          // Add suburb/neighborhood
          if (addr.suburb) addressParts.push(addr.suburb);

          // Add city, state, postcode
          if (cityComponent) addressParts.push(cityComponent);
          if (stateComponent) addressParts.push(stateComponent);
          if (addr.postcode) addressParts.push(addr.postcode);

          // Add country
          if (addr.country) addressParts.push(addr.country);

          formattedAddress = addressParts.join(', ');

          // Use the formatted address or fallback to display_name
          updateFormData({ address: formattedAddress || data.display_name });
        } else if (data.display_name) {
          updateFormData({ address: data.display_name });
        }

        setLocationFound(true);
      }
    } catch (error) {
      console.error('Error getting location details:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for phone number to ensure proper formatting
    if (name === 'phoneNumber') {
      // Remove any non-digit characters and the +91 prefix if present
      let phoneNumber = value.replace(/\D/g, '');
      if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
        phoneNumber = phoneNumber.substring(2);
      }
      // Keep only the last 10 digits
      phoneNumber = phoneNumber.slice(-10);
      updateFormData({ [name]: phoneNumber });
    } else {
      updateFormData({ [name]: value });
    }
  };

  // Handle state selection from dropdown
  const handleStateSelect = (stateCode, stateName) => {
    updateFormData({
      state: stateCode,
      stateName: stateName
    });
    setStateSearchTerm(stateName);
    setShowStateDropdown(false);
    // Clear city when state changes
    updateFormData({
      city: '',
      cityName: ''
    });
    setCitySearchTerm('');
  };

  // Handle city selection from dropdown
  const handleCitySelect = (cityId, cityName) => {
    updateFormData({
      city: cityId,
      cityName: cityName
    });
    setCitySearchTerm(cityName);
    setShowCityDropdown(false);
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

  const handleMapClick = (latlng) => {
    const { lat, lng } = latlng;
    updateFormData({ location: { lat, lng } });
    // Get state and city from the clicked location
    getLocationDetails(lat, lng);
  };

  // Geocode the address to get coordinates using Nominatim
  const geocodeAddress = async (address) => {
    if (!address) return;

    try {
      // Append India to improve geocoding accuracy since your app focuses on Indian addresses
      const searchAddress = `${address}, India`;

      // Add headers to comply with Nominatim usage policy
      const headers = {
        'Accept-Language': 'en',
        'User-Agent': 'UdhyogUnity/1.0', // Application name and version
        'Referrer': window.location.href
      };

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1&countrycodes=in`, {
        headers: headers
      });

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        updateFormData({ location: { lat: parseFloat(lat), lng: parseFloat(lon) } });

        // Get state and city from the geocoded location
        getLocationDetails(lat, lon);

        // Set locationFound to true to show success message
        setLocationFound(true);
      } else {
        console.log("No locations found for the address: ", address);
        // Optional: Show a message to the user that the address couldn't be found
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  const sendOTP2 = async () => {
    if (!formData.phoneNumber) {
      setErrors({ ...errors, phoneNumber: 'Phone number is required' });
      return;
    }

    // Validate phone number format
    if (!/^\d{10}$/.test(formData.phoneNumber)) {
      setErrors({ ...errors, phoneNumber: 'Please enter a valid 10-digit phone number' });
      return;
    }

    try {
      // Format phone number with country code
      const formattedPhone = `+91${formData.phoneNumber}`;

      // Initialize the reCAPTCHA
      initializeRecaptcha('recaptcha-container');

      // Send OTP using Firebase phone auth
      const result = await sendOTPToPhone(formattedPhone);

      // Store the confirmation result for later verification
      setConfirmationResult(result);
      setOtpSent(true);

      // Start countdown timer
      const interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error sending OTP:', error);
      setErrors({ ...errors, phoneNumber: error.message || 'Failed to send OTP. Please try again.' });
    }
  };

  const verifyOTP2 = async () => {
    if (!confirmationResult) {
      setErrors({ ...errors, otp: 'No OTP request found. Please request an OTP first.' });
      return;
    }

    if (!otp || otp.length !== 6) {
      setErrors({ ...errors, otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    try {
      // Verify OTP with Firebase
      await confirmationResult.confirm(otp);

      // OTP verification was successful
      setPhoneVerified(true);
      setErrors({ ...errors, otp: '' });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setErrors({ ...errors, otp: 'Invalid OTP. Please try again.' });
    }
  };

  const resendOTP2 = async () => {
    try {
      // Format phone number with country code
      const formattedPhone = `+91${formData.phoneNumber}`;

      // Clear previous reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      // Re-initialize the reCAPTCHA
      initializeRecaptcha('recaptcha-container');

      // Resend OTP using Firebase phone auth
      const result = await sendOTPToPhone(formattedPhone);

      // Store the new confirmation result
      setConfirmationResult(result);

      // Reset the timer
      setOtpTimer(60);
    } catch (error) {
      console.error('Error resending OTP:', error);
      setErrors({ ...errors, otp: error.message || 'Failed to resend OTP. Please try again.' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    if (!formData.ownerName) {
      newErrors.ownerName = 'Owner name is required';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }

    if (!phoneVerified) {
      newErrors.phoneNumber = 'Please verify your phone number';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address) {
      newErrors.address = 'Business address is required';
    }

    if (!formData.state) {
      newErrors.state = 'Please select a state';
    }

    if (!formData.city) {
      newErrors.city = 'Please select a city';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.state) {
      fetchCities(formData.state);
    } else {
      setCities([]);
    }
  }, [formData.state]);

  // Geocode address when it changes
  useEffect(() => {
    if (formData.address && formData.address.length > 5) {
      // Add a small delay to avoid making too many API calls while typing
      const timer = setTimeout(() => {
        geocodeAddress(formData.address);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [formData.address]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="form-step"
    >
      <h2 className="text-center mb-4">How Can Customers Reach You?</h2>

      <div className="neumorphic-card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="ownerName" className="form-label">
                  <User size={16} className="me-1" /> Owner's Name*
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Enter owner's name"
                />
                {errors.ownerName && <div className="error-message">{errors.ownerName}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="phoneNumber" className="form-label">
                  <Phone size={16} className="me-1" /> Phone Number*
                </label>
                <div className="input-group">
                  <span className="input-group-text">+91 </span>
                  <input
                    type="text"
                    className="form-control"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleChange}
                    placeholder="Enter 10-digit phone number"
                    disabled={phoneVerified}
                    maxLength="10"
                  />

                  {!otpSent && !phoneVerified && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={sendOTP2}
                    >
                      Send OTP
                    </button>
                  )}
                  {phoneVerified && (
                    <span className="input-group-text bg-success text-white">
                      Verified ✓
                    </span>
                  )}
                </div>
                {errors.phoneNumber && <div className="error-message">{errors.phoneNumber}</div>}
              </div>

              {otpSent && !phoneVerified && (
                <div className="mb-3">
                  <label htmlFor="otp" className="form-label">Enter OTP</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                    />
                    <button
                      type="button"
                      className="btn btn-primary m-0 py-2 px-4"
                      onClick={verifyOTP2}
                    >
                      Verify
                    </button>
                  </div>
                  {errors.otp && <div className="error-message">{errors.otp}</div>}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">
                      {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Didn\'t receive OTP?'}
                    </small>
                    {otpTimer === 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-md p-2 m-0"
                        onClick={resendOTP2}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <small className="text-info">You will receive the OTP via SMS on your mobile number</small>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  <Mail size={16} className="me-1" /> Email Address*
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-4">
                <label htmlFor="address" className="form-label">
                  <MapPin size={16} className="me-1" /> Business Address* <small className="text-muted">(Type to see on map)</small>
                </label>
                <textarea
                  className="form-control"
                  id="address"
                  name="address" style={{ height: 'auto' }}
                  rows="4"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="Enter complete business address"
                ></textarea>
                {errors.address && <div className="error-message">{errors.address}</div>}
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="state" className="form-label">State*</label>
                    <select
                      className="form-select"
                      id="state"
                      name="state"
                      value={formData.state || ''}
                      onChange={(e) => {
                        const selectedState = states.find(state => state.iso2 === e.target.value);
                        if (selectedState) {
                          handleStateSelect(selectedState.iso2, selectedState.name);
                        } else {
                          handleChange(e);
                        }
                      }}
                      disabled={isLoadingStates}
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state.iso2} value={state.iso2}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {isLoadingStates && <small className="text-muted">Loading states...</small>}
                    {errors.state && <div className="error-message">{errors.state}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="city" className="form-label">City*</label>
                    <select
                      className="form-select"
                      id="city"
                      name="city"
                      value={formData.city || ''}
                      onChange={(e) => {
                        const selectedCity = cities.find(city => city.id.toString() === e.target.value);
                        if (selectedCity) {
                          handleCitySelect(selectedCity.id, selectedCity.name);
                        } else {
                          handleChange(e);
                        }
                      }}
                      disabled={isLoadingCities || !formData.state}
                    >
                      <option value="">Select city</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                    {isLoadingCities && <small className="text-muted">Loading cities...</small>}
                    {!formData.state && !errors.state && <small className="text-muted">Please select a state first</small>}
                    {errors.city && <div className="error-message">{errors.city}</div>}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">Location on Map</label>
                  <small className="text-muted">
                    <Navigation size={14} className="me-1" /> Map updates as you type your address
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="map-container mb-4" style={{ height: '300px', width: '100%' }}>
            <div className="mb-2">
              {locationFound && (
                <div className="alert alert-success py-2">
                  <small>Address location detected. Map and location details updated!</small>
                </div>
              )}
            </div>
            <MapContainer
              center={formData.location ? [formData.location.lat, formData.location.lng] : [28.6139, 77.2090]}
              zoom={12}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapPositionHandler position={formData.location ? [formData.location.lat, formData.location.lng] : null} />
              <MapClickHandler onMapClick={handleMapClick} />
              {formData.location && (
                <Marker position={[formData.location.lat, formData.location.lng]}>
                  <Popup>
                    {formData.address || 'Selected Location'}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onPrevious}
            >
              <ArrowLeft size={16} className="me-2" /> Previous
            </button>
            <button type="submit" className="btn btn-primary">
              Next <ArrowRight size={16} className="ms-2" />
            </button>
          </div>

          {/* Hidden reCAPTCHA container */}
          <div id="recaptcha-container"></div>
        </form>
      </div>
    </motion.div>
  );
};

export default ContactLocationForm;