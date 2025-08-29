import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SignIn from "./miniComponents/LoginForm/SignIn";
import SignUp from "./miniComponents/LoginForm/SignUp";
import { signIn, signUp, signInWithGoogle } from "../Firebase/auth";
import { addUserToFirestore, getUserFromFirestore } from "../Firebase/db";
import { useAuth } from "../context/AuthContext";
import loginImage from "../assets/login.jpg";
import "./styles/Login.css";

function Login() {
    const [activeTab, setActiveTab] = useState("signin");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSignupActive, setIsSignupActive] = useState(false);
    const [signinForm, setSigninForm] = useState({ email: "", password: "" });
    const [signupForm, setSignupForm] = useState({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        city: "",
        cityName: "",
        state: "",
        stateName: "",
        address: "",
        password: "",
        profilePicture: null,
        isGoogleUser: false
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSuccessfullyLoggedIn, setIsSuccessfullyLoggedIn] = useState(false);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Create a state to track if we need to show profile completion modal
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [googleUser, setGoogleUser] = useState(null);
    const profileCompletionRef = useRef(null);

    // Add state for profile completion form
    const [profileCompletionForm, setProfileCompletionForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        city: "",
        cityName: "",
        state: "",
        stateName: "",
        address: "",
        profilePicture: null
    });

    // State and city dropdown management for profile completion modal
    const [modalStates, setModalStates] = useState([]);
    const [modalCities, setModalCities] = useState([]);
    const [isLoadingModalStates, setIsLoadingModalStates] = useState(false);
    const [isLoadingModalCities, setIsLoadingModalCities] = useState(false);
    const [modalStateSearchTerm, setModalStateSearchTerm] = useState('');
    const [modalCitySearchTerm, setModalCitySearchTerm] = useState('');
    const [showModalStateDropdown, setShowModalStateDropdown] = useState(false);
    const [showModalCityDropdown, setShowModalCityDropdown] = useState(false);

    // Refs for modal dropdowns
    const modalStateDropdownRef = useRef(null);
    const modalCityDropdownRef = useRef(null);

    // Reset successful login state when user logs out
    useEffect(() => {
        if (!currentUser) {
            setIsSuccessfullyLoggedIn(false);
        }
    }, [currentUser]);

    useEffect(() => {
        document.body.classList.add("login-page");
        return () => {
            document.body.classList.remove("login-page");
        };
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIsSignupActive(tab === "signup");
        setError("");
        setIsSuccessfullyLoggedIn(false);

        if (tab === "signin") {
            setSignupForm({
                email: "",
                firstName: "",
                lastName: "",
                phone: "",
                city: "",
                cityName: "",
                state: "",
                stateName: "",
                address: "",
                password: "",
                profilePicture: null,
                isGoogleUser: false
            });
        }
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const toggleSignupPasswordVisibility = () => {
        setSignupPasswordVisible(!signupPasswordVisible);
    };

    // Fetch states for modal dropdowns
    const fetchModalStates = async () => {
        setIsLoadingModalStates(true);
        try {
            const response = await fetch('https://api.countrystatecity.in/v1/countries/IN/states', {
                headers: {
                    'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ=='
                }
            });

            if (response.ok) {
                const data = await response.json();
                setModalStates(data);
            }
        } catch (error) {
            console.error('Error fetching states:', error);
        } finally {
            setIsLoadingModalStates(false);
        }
    };

    // Fetch cities for modal dropdowns
    const fetchModalCities = async (stateCode) => {
        setIsLoadingModalCities(true);
        try {
            const response = await fetch(`https://api.countrystatecity.in/v1/countries/IN/states/${stateCode}/cities`, {
                headers: {
                    'X-CSCAPI-KEY': 'YTBrQWhHWEVWUk9SSEVSYllzbVNVTUJWRm1oaFBpN2FWeTRKbFpqbQ=='
                }
            });

            if (response.ok) {
                const data = await response.json();
                setModalCities(data);
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setModalCities([]);
        } finally {
            setIsLoadingModalCities(false);
        }
    };

    // Find state name by code for modal
    const getModalStateName = (stateCode) => {
        const state = modalStates.find(s => s.iso2 === stateCode);
        return state ? state.name : '';
    };

    // Find city name by id for modal
    const getModalCityName = (cityId) => {
        const city = modalCities.find(c => c.id === cityId);
        return city ? city.name : '';
    };

    // Handle state selection in modal
    const handleModalStateSelect = (stateCode, stateName) => {
        setSignupForm({
            ...signupForm,
            state: stateCode,
            stateName: stateName,
            city: '',
            cityName: ''
        });
        setModalStateSearchTerm(stateName);
        setShowModalStateDropdown(false);
        setModalCities([]);
        fetchModalCities(stateCode);
    };

    // Handle city selection in modal
    const handleModalCitySelect = (cityId, cityName) => {
        setSignupForm({
            ...signupForm,
            city: cityId,
            cityName: cityName
        });
        setModalCitySearchTerm(cityName);
        setShowModalCityDropdown(false);
    };

    // Handle clicks outside modal dropdowns
    const handleModalClickOutside = (event) => {
        if (modalStateDropdownRef.current && !modalStateDropdownRef.current.contains(event.target)) {
            setShowModalStateDropdown(false);
        }
        if (modalCityDropdownRef.current && !modalCityDropdownRef.current.contains(event.target)) {
            setShowModalCityDropdown(false);
        }
    };

    // Initialize modal dropdowns when profile completion is shown
    useEffect(() => {
        if (showProfileCompletion) {
            fetchModalStates();

            // Add click event listener for modal dropdowns
            document.addEventListener('mousedown', handleModalClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleModalClickOutside);
            };
        }
    }, [showProfileCompletion]);

    // Update modal search terms when form data changes
    useEffect(() => {
        if (signupForm.state) {
            setModalStateSearchTerm(getModalStateName(signupForm.state));
        }
    }, [signupForm.state, modalStates]);

    useEffect(() => {
        if (signupForm.city) {
            setModalCitySearchTerm(getModalCityName(signupForm.city));
        }
    }, [signupForm.city, modalCities]);

    const handleGoogleProfileCompletion = async (e) => {
        e.preventDefault();
        console.log("Handling Google profile completion submission");
        setError("");
        setLoading(true);
        try {
            // Validate city and phone
            if (!signupForm.city || !signupForm.phone || !signupForm.state) {
                setError("Please enter Phone Number and select both State and City.");
                setLoading(false);
                return;
            }
            // Save new user as customer
            const userData = {
                email: signupForm.email,
                firstName: signupForm.firstName,
                lastName: signupForm.lastName,
                phone: signupForm.phone,
                city: signupForm.city,
                cityName: signupForm.cityName,
                state: signupForm.state,
                stateName: signupForm.stateName,
                address: signupForm.address,
                userType: 'customer',
                isGoogleUser: true
            };
            await addUserToFirestore({ email: signupForm.email }, userData);
            setIsSuccessfullyLoggedIn(true);
            setError("Signed in successfully with Google!");
            setShowProfileCompletion(false);
            navigate("/dashboard");
        } catch (err) {
            setError("Failed to complete profile: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async (options = {}) => {
        try {
            setLoading(true);
            setError("");
            setIsSuccessfullyLoggedIn(false); // Reset state

            // Handle profile completion case
            if (options.completeProfile && options.profileData) {
                console.log("Completing profile for Google user:", options.profileData);

                // Validate profile data
                if (!options.profileData.city || !options.profileData.phone || !options.profileData.state) {
                    setError("Please enter Phone Number and select both State and City.");
                    return null;
                }

                // Save user data to Firestore
                const userData = {
                    email: options.profileData.email,
                    firstName: options.profileData.firstName,
                    lastName: options.profileData.lastName,
                    phone: options.profileData.phone,
                    city: options.profileData.city,
                    cityName: options.profileData.cityName,
                    state: options.profileData.state,
                    stateName: options.profileData.stateName,
                    address: options.profileData.address,
                    photoURL: options.profileData.photoURL || "",
                    userType: 'customer'
                };

                await addUserToFirestore({ email: options.profileData.email }, userData);
                setIsSuccessfullyLoggedIn(true);
                setError("Signed in successfully with Google!");
                navigate("/dashboard");
                return userData;
            }

            // Normal Google sign-in flow
            // Authenticate with Google
            const user = await signInWithGoogle();

            // Fetch user details from Firestore
            const userDoc = await getUserFromFirestore(user.email);
            const userExists = userDoc !== null;
            const nameParts = user.displayName ? user.displayName.split(" ") : ["", ""];

            console.log("Google Sign-In:", {
                userExists,
                email: user.email,
                activeTab,
                userDoc
            });

            if (activeTab === "signup") {
                if (userExists) {
                    setError("User already exists with this Google account. Please use the Sign In tab to continue.");
                    setActiveTab("signin");
                    setIsSignupActive(false);
                    setSigninForm({
                        email: user.email,
                        password: ""
                    });
                    return user;
                } else {
                    // New user, allow profile completion
                    const newUserData = {
                        email: user.email,
                        firstName: nameParts[0] || "",
                        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                        photoURL: user.photoURL || ""
                    };

                    // Call the onNewUser callback if provided
                    if (options.onNewUser && typeof options.onNewUser === 'function') {
                        const handled = options.onNewUser(newUserData);
                        if (handled) {
                            return newUserData;
                        }
                    }

                    // Otherwise use the old flow
                    setSignupForm({
                        email: user.email,
                        firstName: nameParts[0] || "",
                        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                        phone: "",
                        city: "",
                        cityName: "",
                        state: "",
                        stateName: "",
                        address: "",
                        password: "",
                        profilePicture: null,
                        isGoogleUser: true
                    });
                    setShowProfileCompletion(true); // Show profile completion modal
                    setGoogleUser(user);
                    setError("Please provide your details to complete signup.");
                    return newUserData;
                }
            } else {
                // activeTab === 'signin'
                if (!userExists) {
                    console.log("Google sign-in - New user in SIGNIN tab, showing profile completion modal");

                    // Create new user data object
                    const newUserData = {
                        email: user.email,
                        firstName: nameParts[0] || "",
                        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                        photoURL: user.photoURL || ""
                    };

                    // Call the onNewUser callback if provided
                    if (options.onNewUser && typeof options.onNewUser === 'function') {
                        const handled = options.onNewUser(newUserData);
                        if (handled) {
                            return newUserData;
                        }
                    }

                    // Otherwise use the old flow
                    setSignupForm({
                        email: user.email,
                        firstName: nameParts[0] || "",
                        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                        phone: "",
                        city: "",
                        cityName: "",
                        state: "",
                        stateName: "",
                        address: "",
                        password: "",
                        profilePicture: null,
                        isGoogleUser: true
                    });
                    setShowProfileCompletion(true); // Show profile completion modal
                    setGoogleUser(user);
                    setError("Please complete your profile to continue.");
                    return newUserData;
                } else {
                    // User exists, just proceed with login
                    console.log("Google sign-in - Existing user, proceeding with login:", {
                        email: user.email
                    });
                    setIsSuccessfullyLoggedIn(true);
                    setError("Signed in successfully with Google!");
                    navigate("/dashboard");
                    return user;
                }
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            setError("Failed to sign in with Google: " + error.message);
            setIsSuccessfullyLoggedIn(false);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (activeTab === "signup") {
                if (signupForm.isGoogleUser) {
                    // Validate required fields for Google users
                    if (!signupForm.firstName || !signupForm.lastName || !signupForm.phone || !signupForm.city) {
                        throw new Error("Please fill in all required fields (First Name, Last Name, Phone, City)");
                    }

                    // For Google users, just update their profile in Firestore
                    const userData = {
                        email: signupForm.email,
                        firstName: signupForm.firstName,
                        lastName: signupForm.lastName,
                        phone: signupForm.phone,
                        city: signupForm.city,
                        cityName: signupForm.cityName,
                        state: signupForm.state,
                        stateName: signupForm.stateName,
                        address: signupForm.address,
                        userType: 'customer'
                    };

                    await addUserToFirestore({ email: signupForm.email }, userData);
                    setError("Profile completed successfully! You are now signed in.");
                    setIsSuccessfullyLoggedIn(true); // Mark as successfully logged in
                    navigate("/dashboard");

                    // Reset the Google user flag and clear form
                    setSignupForm({
                        email: "",
                        firstName: "",
                        lastName: "",
                        phone: "",
                        city: "",
                        cityName: "",
                        state: "",
                        stateName: "",
                        address: "",
                        password: "",
                        profilePicture: null,
                        isGoogleUser: false
                    });
                } else {
                    // Check if this is an existing user completing their profile
                    const existingUser = await getUserFromFirestore(signupForm.email);

                    if (existingUser) {
                        // This is an existing user completing their profile - no password needed
                        if (!signupForm.firstName || !signupForm.lastName || !signupForm.phone || !signupForm.city) {
                            throw new Error("Please fill in all required fields (First Name, Last Name, Phone, City)");
                        }

                        // Update existing user's profile in Firestore
                        const userData = {
                            firstName: signupForm.firstName,
                            lastName: signupForm.lastName,
                            phone: signupForm.phone,
                            city: signupForm.city,
                            cityName: signupForm.cityName,
                            state: signupForm.state,
                            stateName: signupForm.stateName,
                            address: signupForm.address,
                        };

                        await addUserToFirestore({ email: signupForm.email }, userData);
                        setError("Profile completed successfully! You are now signed in.");
                        setIsSuccessfullyLoggedIn(true); // Mark as successfully logged in
                        navigate("/dashboard");

                        // Clear form
                        setSignupForm({
                            email: "",
                            firstName: "",
                            lastName: "",
                            phone: "",
                            city: "",
                            cityName: "",
                            state: "",
                            stateName: "",
                            address: "",
                            password: "",
                            profilePicture: null,
                            isGoogleUser: false
                        });
                    } else {
                        // Validate required fields for regular signup (new users)
                        if (!signupForm.email || !signupForm.firstName || !signupForm.lastName ||
                            !signupForm.phone || !signupForm.city || !signupForm.password) {
                            throw new Error("Please fill in all required fields");
                        }

                        // Regular signup process
                        const userData = {
                            email: signupForm.email,
                            firstName: signupForm.firstName,
                            lastName: signupForm.lastName,
                            phone: signupForm.phone,
                            city: signupForm.city,
                            cityName: signupForm.cityName,
                            state: signupForm.state,
                            stateName: signupForm.stateName,
                            address: signupForm.address,
                            userType: 'customer'
                        };

                        await signUp(signupForm.email, signupForm.password, userData);
                        setError("Account created successfully! You can now sign in.");
                        setActiveTab("signin");
                        setIsSignupActive(false);
                    }
                }
            } else {
                // Validate signin fields
                if (!signinForm.email || !signinForm.password) {
                    throw new Error("Please enter both email and password");
                }

                // Sign in - first authenticate then check user profile
                await signIn(signinForm.email, signinForm.password);

                // After successful authentication, check if user has complete profile
                const userDoc = await getUserFromFirestore(signinForm.email);

                // Only set as successfully logged in if profile is complete
                if (userDoc && userDoc.firstName && userDoc.phone && userDoc.city) {
                    setIsSuccessfullyLoggedIn(true);
                    setError("Signed in successfully!");
                    navigate("/dashboard");
                } else {
                    // Profile is incomplete - user can sign in but should complete profile first
                    setIsSuccessfullyLoggedIn(false);

                    // Pre-fill signup form with existing user data for profile completion
                    setSignupForm({
                        email: signinForm.email,
                        firstName: userDoc?.firstName || "",
                        lastName: userDoc?.lastName || "",
                        phone: userDoc?.phone || "",
                        city: userDoc?.city || "",
                        cityName: userDoc?.cityName || "",
                        state: userDoc?.state || "",
                        stateName: userDoc?.stateName || "",
                        address: userDoc?.address || "",
                        password: "", // Not needed for profile completion
                        profilePicture: null,
                        isGoogleUser: false // This will be treated as a profile completion
                    });

                    // Switch to signup tab for profile completion
                    setActiveTab("signup");
                    setIsSignupActive(true);

                    setError("Please complete your profile to access the dashboard. Missing: " +
                        [
                            !userDoc?.firstName ? "First Name" : "",
                            !userDoc?.phone ? "Phone" : "",
                            !userDoc?.city ? "City" : ""
                        ].filter(Boolean).join(", "));
                }
            }
        } catch (error) {
            console.error("Authentication error:", error);
            setError("Failed to " + (activeTab === "signup" ? "complete profile" : "sign in") + ": " + error.message);
        }

        setLoading(false);
    };

    const handleProfileCompletionSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Validate required fields
            if (
                !profileCompletionForm.firstName ||
                !profileCompletionForm.lastName ||
                !profileCompletionForm.phone ||
                !profileCompletionForm.city ||
                !profileCompletionForm.state
            ) {
                throw new Error("Please fill in all required fields (First Name, Last Name, Phone, State, City)");
            }

            // Update user profile in Firestore
            const userData = {
                firstName: profileCompletionForm.firstName,
                lastName: profileCompletionForm.lastName,
                phone: profileCompletionForm.phone,
                city: profileCompletionForm.city,
                cityName: profileCompletionForm.cityName,
                state: profileCompletionForm.state,
                stateName: profileCompletionForm.stateName,
                address: profileCompletionForm.address,
                userType: 'customer'
            };

            await addUserToFirestore({ email: googleUser?.email || signupForm.email }, userData);
            setError("Profile completed successfully! You are now signed in.");
            setIsSuccessfullyLoggedIn(true);
            setShowProfileCompletion(false);
            navigate("/dashboard");

            // Reset form
            setProfileCompletionForm({
                firstName: "",
                lastName: "",
                phone: "",
                city: "",
                cityName: "",
                state: "",
                stateName: "",
                address: "",
                profilePicture: null
            });
        } catch (error) {
            console.error("Profile completion error:", error);
            setError("Failed to complete profile: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileCompletionFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileCompletionForm({ ...profileCompletionForm, profilePicture: file });
        }
    };

    // Clear Google user profile form when showProfileCompletion changes
    useEffect(() => {
        if (!showProfileCompletion) {
            // Reset when modal is closed
            setGoogleUser(null);
        }
    }, [showProfileCompletion]);

    // Debug profile completion state changes
    useEffect(() => {
        console.log("showProfileCompletion effect triggered:", {
            showProfileCompletion,
            isGoogleUser: signupForm.isGoogleUser,
            email: signupForm.email,
            firstName: signupForm.firstName,
            phone: signupForm.phone,
            city: signupForm.city
        });
    }, [showProfileCompletion, signupForm.isGoogleUser, signupForm.email, signupForm.firstName, signupForm.phone, signupForm.city]);

    return (
        <div className="Login">
            {/* Modal for Google Sign-In profile completion (city/phone) */}
            {showProfileCompletion && signupForm.isGoogleUser && (
                <div className="profile-completion-modal" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="modal-container" style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '500px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                    }}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            console.log("Profile completion form submitted for:", signupForm.email);
                            setError("");
                            setLoading(true);

                            // Save user data - city and phone can be empty
                            const userData = {
                                email: signupForm.email,
                                firstName: signupForm.firstName,
                                lastName: signupForm.lastName,
                                phone: signupForm.phone || "",
                                city: signupForm.city || "",
                                cityName: signupForm.cityName || "",
                                state: signupForm.state || "",
                                stateName: signupForm.stateName || "",
                                address: signupForm.address || "",
                                userType: 'customer'
                                // Not storing isGoogleUser flag as it's not in your schema
                            };

                            console.log("Saving user profile:", userData);

                            addUserToFirestore({ email: signupForm.email }, userData)
                                .then(() => {
                                    console.log("Profile completed successfully!");
                                    setIsSuccessfullyLoggedIn(true);
                                    setError("Signed in successfully with Google!");
                                    setShowProfileCompletion(false);
                                    navigate("/dashboard");
                                })
                                .catch(err => {
                                    setError("Failed to complete profile: " + err.message);
                                })
                                .finally(() => {
                                    setLoading(false);
                                });
                        }}>
                            <div className="modal-header" style={{
                                borderBottom: '1px solid #eee',
                                padding: '18px 20px',
                                background: 'linear-gradient(120deg, rgba(64, 77, 141, 1) 15%, rgba(89, 109, 181, 1) 50%, rgba(22, 155, 223, 1) 100%)'
                            }}>
                                <h5 className="modal-title" style={{
                                    margin: 0,
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 500
                                }}>Complete Your Profile</h5>
                            </div>
                            <div className="modal-body" style={{ padding: '20px' }}>

                                {/* State Dropdown (required) */}
                                <div className="mb-3">
                                    <label className="form-label">State <span className="text-danger">*</span></label>
                                    <div className="dropdown-container" ref={modalStateDropdownRef}>
                                        <div className="search-input-container">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search and select state..."
                                                value={modalStateSearchTerm}
                                                onChange={(e) => {
                                                    setModalStateSearchTerm(e.target.value);
                                                    setShowModalStateDropdown(true);
                                                }}
                                                onFocus={() => setShowModalStateDropdown(true)}
                                                required
                                            />
                                            {modalStateSearchTerm && (
                                                <span
                                                    className="clear-icon"
                                                    onClick={() => {
                                                        setModalStateSearchTerm('');
                                                        setSignupForm(f => ({ ...f, state: '', stateName: '', city: '', cityName: '' }));
                                                        setModalCities([]);
                                                    }}
                                                    style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }}
                                                >
                                                    ✕
                                                </span>
                                            )}
                                        </div>
                                        {showModalStateDropdown && (
                                            <div className="dropdown-menu show">
                                                {isLoadingModalStates ? (
                                                    <div className="dropdown-item">Loading states...</div>
                                                ) : modalStates.filter(state =>
                                                    state.name.toLowerCase().includes(modalStateSearchTerm.toLowerCase())
                                                ).length > 0 ? (
                                                    modalStates.filter(state =>
                                                        state.name.toLowerCase().includes(modalStateSearchTerm.toLowerCase())
                                                    ).map((state) => (
                                                        <div
                                                            key={state.iso2}
                                                            className="dropdown-item"
                                                            onClick={() => handleModalStateSelect(state.iso2, state.name)}
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

                                {/* City Dropdown (required) */}
                                <div className="mb-3">
                                    <label className="form-label">City <span className="text-danger">*</span></label>
                                    <div className="dropdown-container" ref={modalCityDropdownRef}>
                                        <div className="search-input-container">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder={signupForm.state ? "Search and select city..." : "Please select a state first"}
                                                value={modalCitySearchTerm}
                                                onChange={(e) => {
                                                    setModalCitySearchTerm(e.target.value);
                                                    setShowModalCityDropdown(true);
                                                }}
                                                onFocus={() => signupForm.state && setShowModalCityDropdown(true)}
                                                disabled={!signupForm.state}
                                                required
                                            />
                                            {modalCitySearchTerm && (
                                                <span
                                                    className="clear-icon"
                                                    onClick={() => {
                                                        setModalCitySearchTerm('');
                                                        setSignupForm(f => ({ ...f, city: '', cityName: '' }));
                                                    }}
                                                    style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }}
                                                >
                                                    ✕
                                                </span>
                                            )}
                                        </div>
                                        {showModalCityDropdown && signupForm.state && (
                                            <div className="dropdown-menu show">
                                                {isLoadingModalCities ? (
                                                    <div className="dropdown-item">Loading cities...</div>
                                                ) : modalCities.filter(city =>
                                                    city.name.toLowerCase().includes(modalCitySearchTerm.toLowerCase())
                                                ).length > 0 ? (
                                                    modalCities.filter(city =>
                                                        city.name.toLowerCase().includes(modalCitySearchTerm.toLowerCase())
                                                    ).map((city) => (
                                                        <div
                                                            key={city.id}
                                                            className="dropdown-item"
                                                            onClick={() => handleModalCitySelect(city.id, city.name)}
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

                                {/* Phone Number */}
                                <div className="mb-3">
                                    <label className="form-label">Phone Number (optional)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter phone number..."
                                        value={signupForm.phone}
                                        onChange={e => setSignupForm(f => ({ ...f, phone: e.target.value }))}
                                    />
                                </div>

                                {/* Address */}
                                <div className="mb-3">
                                    <label className="form-label">Address (optional)</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="Enter your complete address..."
                                        value={signupForm.address || ''}
                                        onChange={e => setSignupForm(f => ({ ...f, address: e.target.value }))}
                                    />
                                </div>

                                {error && <div className="alert alert-danger">{error}</div>}
                            </div>
                            <div className="modal-footer" style={{
                                borderTop: '1px solid #eee',
                                padding: '15px 20px',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button type="submit" className="regBtn" style={{
                                    padding: '8px 20px',
                                    width: 'auto'
                                }} disabled={loading}>
                                    {loading ? 'Processing...' : 'Continue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <nav className="navbar navbar-expand-lg ">
                <div className="container">
                    <div className="logo col-md-2">UdhyogUnity</div>
                </div>
            </nav>
            <header id="header">
                <div className="container px-4">
                    <div className="row">
                        <div className="col-md-6 d-flex align-items-center justify-content-start">
                            <img src={loginImage} alt="login img" className="img-fluid hero-img" />
                        </div>
                        <div className="col-md-6 rightSec">
                            <div id="ele1" className={`OuterCircle animateElement signup d-flex align-items-center justify-content-center ${isSignupActive ? "signup" : "signin"}`}>
                                <div className="InnerCircle"></div>
                            </div>
                            <div id="ele2" className={`OuterCircle1 animateElement signup d-flex align-items-center justify-content-center ${isSignupActive ? "signup" : "signin"}`}>
                                <div className="InnerCircle1"></div>
                            </div>
                            <div id="ele3" className={`CustomerOuter animateElement signup d-flex align-items-center justify-content-center ${isSignupActive ? "signup" : "signin"}`}>
                                <p>Customer</p>
                            </div>
                            <div id="ele4" className={`BusinessesOuter animateElement signup d-flex align-items-center justify-content-center ${isSignupActive ? "signup" : "signin"}`}>
                                <p>Businesses</p>
                            </div>
                            <div id="card" className={`card py-1 d-flex flex-column align-items-center gap-3`}>
                                {error && <div className={`alert ${error.includes("successfully") ? "alert-success" : "alert-danger"}`} role="alert">{error}</div>}
                                <div className="front">
                                    <ul className="nav nav-tabs" id="myTab" role="tablist">
                                        <li className="nav-item">
                                            <button className={`nav-link ${activeTab === "signup" ? "active" : ""}`}
                                                onClick={() => handleTabChange("signup")}>Sign Up</button>
                                        </li>
                                        <li className="nav-item">
                                            <button className={`nav-link ${activeTab === "signin" ? "active" : ""}`}
                                                onClick={() => handleTabChange("signin")}>Sign In</button>
                                        </li>
                                    </ul>
                                    <div className="tab-content" id="myTabContent">
                                        {activeTab === "signin" &&
                                            <SignIn
                                                signinForm={signinForm}
                                                setSigninForm={setSigninForm}
                                                passwordVisible={passwordVisible}
                                                togglePasswordVisibility={togglePasswordVisibility}
                                                handleFormSubmit={handleFormSubmit}
                                                handleTabChange={handleTabChange}
                                                handleGoogleSignIn={handleGoogleSignIn}
                                                loading={loading}
                                                currentUser={currentUser}
                                                isSuccessfullyLoggedIn={isSuccessfullyLoggedIn}
                                            />}
                                        {activeTab === "signup" &&
                                            <SignUp
                                                signupForm={signupForm}
                                                setSignupForm={setSignupForm}
                                                signupPasswordVisible={signupPasswordVisible}
                                                togglePasswordVisibility={toggleSignupPasswordVisibility}
                                                handleFormSubmit={handleFormSubmit}
                                                handleTabChange={handleTabChange}
                                                handleGoogleSignIn={handleGoogleSignIn}
                                                loading={loading}
                                                currentUser={currentUser}
                                                isSuccessfullyLoggedIn={isSuccessfullyLoggedIn}
                                            />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

export default Login;