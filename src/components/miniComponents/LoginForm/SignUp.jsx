import React from "react";
import { Link } from "react-router-dom";

function SignUp({ signupForm, setSignupForm, signupPasswordVisible, togglePasswordVisibility, handleFormSubmit, handleTabChange, handleGoogleSignIn, loading, currentUser, isSuccessfullyLoggedIn }) {
    // We'll keep this function but won't use the profile picture
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSignupForm({ ...signupForm, profilePicture: file });
        }
    };

    const isGoogleUser = signupForm.isGoogleUser;

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
                    <div className="mb-3">
                        <label htmlFor="city" className="form-label">
                            City {isGoogleUser && <span className="text-danger">*</span>}
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id="city"
                            placeholder="Enter City..."
                            value={signupForm.city}
                            onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                            required
                        />
                    </div>

                    {/* Only show password field for new users (not Google users or existing users completing profile) */}
                    {!isGoogleUser && !(signupForm.password === "" && signupForm.email) && (
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
                                (isGoogleUser ? 'Completing Profile...' :
                                    (signupForm.password === "" && signupForm.email ? 'Completing Profile...' : 'Registering...')) :
                                (isGoogleUser ? 'Complete Profile' :
                                    (signupForm.password === "" && signupForm.email ? 'Complete Profile' : 'Register'))
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