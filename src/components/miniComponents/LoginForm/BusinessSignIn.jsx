import React, { useState } from "react";

function BusinessSignIn({
    signinForm,
    setSigninForm,
    passwordVisible,
    togglePasswordVisibility,
    handleFormSubmit,
    handleTabChange,
    handlePhoneLogin,
    loading
}) {
    const [loginMethod, setLoginMethod] = useState("email"); // "email" or "phone"

    const handlePhoneChange = (e) => {
        let value = e.target.value;

        // Remove all non-numeric characters except + and spaces
        value = value.replace(/[^\d+\s]/g, '');

        // Auto-add country code if user starts typing without +
        if (value.length > 0 && !value.startsWith('+')) {
            value = '+91' + value;
        }

        setSigninForm({ ...signinForm, phone: value });
    };

    return (
        <div className="tab-pane fade show active" id="business-signin" role="tabpanel" aria-labelledby="business-signin-tab">
            <div className="mb-3">
                <div className="btn-group w-100" role="group" aria-label="Login method">
                    <button
                        type="button"
                        className={`btn ${loginMethod === "email" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setLoginMethod("email")}
                    >
                        <i className="fas fa-envelope me-2"></i>Email Login
                    </button>
                    <button
                        type="button"
                        className={`btn ${loginMethod === "phone" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setLoginMethod("phone")}
                    >
                        <i className="fas fa-mobile-alt me-2"></i>Phone OTP
                    </button>
                </div>
            </div>

            <form onSubmit={handleFormSubmit}>
                <div className="form-fields-container">
                    {loginMethod === "email" ? (
                        <>
                            <div className="mb-3">
                                <label htmlFor="businessSigninEmail" className="form-label">Business Email ID</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="businessSigninEmail"
                                    placeholder="Enter Business Email Id..."
                                    value={signinForm.email}
                                    onChange={(e) => setSigninForm({ ...signinForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="businessSigninPassword" className="form-label">Password</label>
                                <div className="form-control d-flex align-items-center justify-content-between">
                                    <input
                                        type={passwordVisible ? "text" : "password"}
                                        id="businessSigninPassword"
                                        placeholder="Enter Password..."
                                        value={signinForm.password}
                                        onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
                                        required
                                    />
                                    <span id="showPassBusinessSignin" onClick={togglePasswordVisibility}>
                                        <i className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mb-3">
                            <label htmlFor="businessSigninPhone" className="form-label">Business Phone Number</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-phone"></i>
                                </span>
                                <input
                                    type="tel"
                                    className="form-control"
                                    id="businessSigninPhone"
                                    placeholder="+91 XXXXXXXXXX"
                                    value={signinForm.phone}
                                    onChange={handlePhoneChange}
                                    required
                                />
                            </div>
                            <small className="text-muted">
                                <i className="fas fa-info-circle me-1"></i>
                                We'll send an OTP to verify your number
                            </small>
                        </div>
                    )}
                </div>

                <div className="below-btns">
                    {loginMethod === "email" ? (
                        <button type="submit" className="btn regBtn mt-2" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In with Email'}
                        </button>
                    ) : (
                        <button type="button" className="btn regBtn mt-2" onClick={handlePhoneLogin} disabled={loading}>
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    )}

                    <p className="mt-3">
                        Don't have a business account?
                        <a href="#" className="mt-0 anc-link" onClick={() => handleTabChange("business-signup")}>Register Business</a>
                    </p>
                    <p className="mt-2">
                        Are you a customer?
                        <a href="/login" className="mt-0 anc-link">Customer Login</a>
                    </p>
                </div>
            </form>

            {/* Hidden reCAPTCHA container */}
            <div id="recaptcha-container"></div>
        </div>
    );
}

export default BusinessSignIn;
