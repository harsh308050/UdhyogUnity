import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OTPVerification from "./miniComponents/LoginForm/OTPVerification";
import {
    sendOTPToPhone,
    validateBusinessEmailPhone,
    initializeRecaptcha
} from "../Firebase/businessAuth";
import { updateBusinessUserInFirestore } from "../Firebase/businessDb";
import loginImage from "../assets/login.jpg";
import "./styles/Login.css";

function BusinessLogin() {
    const [currentView, setCurrentView] = useState("login");

    const [loginForm, setLoginForm] = useState({
        email: "",
        phone: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [currentPhoneNumber, setCurrentPhoneNumber] = useState("");
    const [validatedBusinessData, setValidatedBusinessData] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        document.body.classList.add("login-page");

        // Check if user came from successful registration
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('registered') === 'true') {
            setShowSuccessMessage(true);
            // Clear the URL parameter
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Clear any existing reCAPTCHA on component mount
        const cleanup = () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                    console.log("Cleared reCAPTCHA on component unmount");
                } catch (error) {
                    console.error("Error clearing reCAPTCHA:", error);
                }
            }
        };

        // Make sure we clean up on mount as well (in case of previous incomplete render)
        cleanup();

        return () => {
            document.body.classList.remove("login-page");
            cleanup();
        };
    }, []);

    const handleLoginFormSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Validate that both email and phone are provided
            if (!loginForm.email || !loginForm.phone) {
                throw new Error("Please enter both email and mobile number");
            }

            // Format phone number (remove spaces and ensure country code)
            let formattedPhone = loginForm.phone.replace(/\s/g, '');
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+91' + formattedPhone;
            }

            // Validate phone number format
            const phoneRegex = /^\+\d{1,4}\d{10}$/;
            if (!phoneRegex.test(formattedPhone)) {
                throw new Error("Please enter a valid mobile number");
            }

            // Check if business exists with this email and validate phone number matches
            const businessData = await validateBusinessEmailPhone(loginForm.email, formattedPhone);

            // Store validated business data for later use
            setValidatedBusinessData(businessData);

            // Send OTP to the validated phone number
            const confirmation = await sendOTPToPhone(formattedPhone);
            setConfirmationResult(confirmation);
            setCurrentPhoneNumber(formattedPhone);
            setCurrentView("otp");

        } catch (error) {
            console.error("Login validation error:", error);
            setError(error.message);
        }

        setLoading(false);
    };

    const handleVerifyOTP = async (confirmationResult, otp) => {
        setError("");
        setLoading(true);

        try {
            // Verify OTP with Firebase
            const result = await confirmationResult.confirm(otp);
            console.log("OTP verified successfully, user:", result.user?.uid);

            // Update last login time in business user document
            if (validatedBusinessData) {
                console.log("Updating last login time for business:", validatedBusinessData.email);
                await updateBusinessUserInFirestore(validatedBusinessData.email, {
                    lastLogin: new Date().toISOString()
                });

                // Store business data in both sessionStorage and localStorage
                sessionStorage.setItem('businessData', JSON.stringify(validatedBusinessData));
                localStorage.setItem('businessEmail', validatedBusinessData.email);

                // Additional flag to help AuthContext identify this as a business login
                sessionStorage.setItem('businessAuthEmail', validatedBusinessData.email);
                sessionStorage.setItem('userType', 'business');

                console.log("Business data stored in session, redirecting to dashboard");
            }

            // Add a small delay to ensure Firebase auth state is updated
            setTimeout(() => {
                navigate("/business-dashboard");
            }, 500);
        } catch (error) {
            console.error("OTP verification error:", error);
            setError("Invalid OTP. Please try again.");
        }

        setLoading(false);
    };

    const handleResendOTP = () => {
        // Resend OTP using the already validated phone number
        if (currentPhoneNumber) {
            sendOTPToPhone(currentPhoneNumber)
                .then(confirmation => {
                    setConfirmationResult(confirmation);
                })
                .catch(error => {
                    setError("Failed to resend OTP. Please try again.");
                });
        }
    };

    const handleBackFromOTP = () => {
        setCurrentView("login");
        setConfirmationResult(null);
        setCurrentPhoneNumber("");
        setValidatedBusinessData(null);
    };

    if (currentView === "otp") {
        return (
            <div className="Login">
                <nav className="navbar navbar-expand-lg">
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
                                <div id="card" className="card py-1 d-flex flex-column align-items-center gap-3">
                                    {error && <div className="alert alert-danger" role="alert">{error}</div>}
                                    <OTPVerification
                                        phoneNumber={currentPhoneNumber}
                                        onVerifyOTP={handleVerifyOTP}
                                        onResendOTP={handleResendOTP}
                                        onBack={handleBackFromOTP}
                                        loading={loading}
                                        confirmationResult={confirmationResult}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
            </div>
        );
    }

    return (
        <div className="Login">
            <nav className="navbar navbar-expand-lg">
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
                            <div id="card" className="card py-4 d-flex flex-column align-items-center gap-3">
                                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                                {showSuccessMessage && (
                                    <div className="alert alert-success" role="alert">
                                        <strong>Registration Successful! 🎉</strong>
                                        <br />Your business has been registered successfully. Please login to access your dashboard.
                                    </div>
                                )}

                                <div className="text-center mb-3">
                                    <h3 className="mb-2 logo ">Business Login</h3>
                                    <p className="text-muted ">Enter your email and mobile number to continue</p>
                                </div>

                                <form onSubmit={handleLoginFormSubmit} className="w-100 d-flex flex-column gap-3" style={{ maxWidth: "400px" }}>
                                    <div className="mb-3">
                                        <label htmlFor="businessEmail" className="form-label">
                                            <i className="fas fa-envelope me-2"></i>Business Email
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="businessEmail"
                                            placeholder="Enter your business email"
                                            value={loginForm.email}
                                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="businessPhone" className="form-label">
                                            <i className="fas fa-mobile-alt me-2"></i>Mobile Number
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">+91</span>
                                            <input
                                                type="tel"
                                                className="form-control"
                                                id="businessPhone"
                                                placeholder="Enter mobile number"
                                                value={loginForm.phone}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^\d]/g, '');
                                                    setLoginForm({ ...loginForm, phone: value });
                                                }}
                                                maxLength="10"
                                                required
                                            />
                                        </div>
                                        <small className="text-muted">We'll send an OTP to verify your number</small>
                                    </div>

                                    <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin me-2"></i>
                                                Validating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sign-in-alt me-2"></i>
                                                Send OTP
                                            </>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <p className="mb-2">
                                            Don't have a business account?
                                            <a href="/register-business" className="ms-1 text-decoration-none">Register Business</a>
                                        </p>
                                        <p className="mb-0">
                                            Are you a customer?
                                            <a href="/login" className="ms-1 text-decoration-none">Customer Login</a>
                                        </p>
                                    </div>
                                </form>

                                {/* Hidden reCAPTCHA container */}
                                <div id="recaptcha-container"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

export default BusinessLogin;
