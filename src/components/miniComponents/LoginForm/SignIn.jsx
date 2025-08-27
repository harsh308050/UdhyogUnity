import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserProfileCompletionModal from "../UserProfileCompletionModal";

function SignIn({ signinForm, setSigninForm, passwordVisible, togglePasswordVisibility, handleFormSubmit, handleTabChange, handleGoogleSignIn, loading, currentUser, isSuccessfullyLoggedIn }) {
    const navigate = useNavigate();

    // State for profile completion modal
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileData, setProfileData] = useState({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        state: "",
        stateName: "",
        city: "",
        cityName: "",
        photoURL: ""
    });
    const [profileError, setProfileError] = useState("");

    // Function to handle Google sign-in with profile completion if needed
    const handleGoogleSignInWithProfileCheck = async () => {
        try {
            // Call the original Google sign-in function, but pass our callback
            // This allows us to intercept the result and show our modal if needed
            const result = await handleGoogleSignIn({
                onNewUser: (userData) => {
                    // If we have a new user from Google, show profile completion modal
                    setProfileData({
                        email: userData.email || "",
                        firstName: userData.firstName || "",
                        lastName: userData.lastName || "",
                        phone: "",
                        state: "",
                        stateName: "",
                        city: "",
                        cityName: "",
                        photoURL: userData.photoURL || ""
                    });
                    setShowProfileModal(true);
                    return true; // Signal that we've handled this
                }
            });

            return result;
        } catch (error) {
            console.error("Google sign-in failed:", error);
        }
    };

    // Handle profile completion submission
    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        // Validate fields
        if (!profileData.state) {
            setProfileError("Please select your state");
            return;
        }

        if (!profileData.city) {
            setProfileError("Please select your city");
            return;
        }

        if (!profileData.phone.trim()) {
            setProfileError("Please enter your phone number");
            return;
        }

        try {
            // Call the profile completion handler
            if (typeof handleGoogleSignIn === 'function') {
                const result = await handleGoogleSignIn({
                    completeProfile: true,
                    profileData
                });

                // If successful, navigate to dashboard
                if (result) {
                    setShowProfileModal(false);
                    navigate("/dashboard");
                    return;
                }
            }
        } catch (error) {
            console.error("Profile completion failed:", error);
            setProfileError("Failed to complete profile. Please try again.");
        }
    };

    return (
        <div className="tab-pane fade show active" id="signin" role="tabpanel" aria-labelledby="signin-tab">
            {/* Profile Completion Modal */}
            <UserProfileCompletionModal
                show={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                userData={profileData}
                setUserData={setProfileData}
                onSubmit={handleProfileSubmit}
                loading={loading}
                error={profileError}
            />

            <form onSubmit={handleFormSubmit}>
                <div className="form-fields-container">
                    <div className="mt-2 mb-2">
                        <label htmlFor="signinEmail" className="form-label">Email ID</label>
                        <input
                            type="email"
                            className="form-control"
                            id="signinEmail"
                            placeholder="Enter Email Id..."
                            value={signinForm.email}
                            onChange={(e) => setSigninForm({ ...signinForm, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="signinPassword" className="form-label">Password</label>
                        <div className="form-control d-flex align-items-center justify-content-between">
                            <input
                                type={passwordVisible ? "text" : "password"}
                                id="signinPassword"
                                placeholder="Enter Password..."
                                value={signinForm.password}
                                onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
                                required
                            />
                            <span id="showPassSignin" onClick={togglePasswordVisibility}>
                                <i className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`} id="SignintogglePasswordIcon"></i>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="below-btns">
                    {isSuccessfullyLoggedIn ? (
                        <Link to="/dashboard" className="btn regBtn mt-2">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <button type="submit" className="btn regBtn mt-2" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="google-btn"
                        onClick={handleGoogleSignInWithProfileCheck}
                        disabled={loading}
                    >
                        <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
                        {loading ? 'Processing...' : 'Continue with Google'}
                    </button>
                    <p className="mt-3">
                        Don't have an account?
                        <a href="#" className="mt-0 anc-link" id="toggleToSignup" onClick={() => handleTabChange("signup")}>Sign Up</a>
                    </p>
                    <p className="mt-2">
                        Are you a business owner?
                        <a href="/business-login" className="mt-0 anc-link">Business Login</a>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default SignIn;