import React from "react";

function BusinessSignUp({
    signupForm,
    setSignupForm,
    passwordVisible,
    togglePasswordVisibility,
    handleFormSubmit,
    handleTabChange,
    loading
}) {
    return (
        <div className="tab-pane fade show active" id="business-signup" role="tabpanel" aria-labelledby="business-signup-tab">
            <form onSubmit={handleFormSubmit}>
                <div className="form-fields-container">
                    <div className="mb-3">
                        <label htmlFor="businessEmail" className="form-label">Business Email ID</label>
                        <input
                            type="email"
                            className="form-control"
                            id="businessEmail"
                            placeholder="Enter Business Email Id..."
                            value={signupForm.email}
                            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="businessName" className="form-label">Business Name</label>
                        <input
                            type="text"
                            className="form-control"
                            id="businessName"
                            placeholder="Enter Business Name..."
                            value={signupForm.businessName}
                            onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label htmlFor="contactPerson" className="form-label">Contact Person Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="contactPerson"
                                placeholder="Enter Contact Person Name..."
                                value={signupForm.contactPerson}
                                onChange={(e) => setSignupForm({ ...signupForm, contactPerson: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="businessPhone" className="form-label">Business Phone</label>
                            <input
                                type="tel"
                                className="form-control"
                                id="businessPhone"
                                placeholder="Enter Business Phone..."
                                value={signupForm.phone}
                                onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="businessType" className="form-label">Business Type</label>
                        <select
                            className="form-select"
                            id="businessType"
                            value={signupForm.businessType}
                            onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })}
                            required
                        >
                            <option value="">Select Business Type</option>
                            <option value="retail">Retail</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="service">Service Provider</option>
                            <option value="manufacturing">Manufacturing</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="technology">Technology</option>
                            <option value="consulting">Consulting</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="businessPassword" className="form-label">Password</label>
                        <div className="form-control d-flex align-items-center justify-content-between">
                            <input
                                type={passwordVisible ? "text" : "password"}
                                id="businessPassword"
                                placeholder="Enter Password..."
                                value={signupForm.password}
                                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                required
                            />
                            <span id="showPassBusinessSignup" onClick={togglePasswordVisibility}>
                                <i className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                            </span>
                        </div>
                        <small className="text-muted">Minimum 6 characters</small>
                    </div>

                    <div className="form-check mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="agreeTermsBusiness"
                            required
                        />
                        <label className="form-check-label" htmlFor="agreeTermsBusiness">
                            <i className="fas fa-shield-alt me-1 text-primary"></i>
                            I agree to the <a href="#" className="text-decoration-none">Terms & Conditions</a> and <a href="#" className="text-decoration-none">Privacy Policy</a>
                        </label>
                    </div>

                    <div className="alert alert-info" role="alert">
                        <i className="fas fa-info-circle me-2"></i>
                        <strong>Note:</strong> After registration, you can complete your business profile with detailed information, verification documents, and payment setup.
                    </div>
                </div>

                <div className="below-btns">
                    <button type="submit" className="btn regBtn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Business Account'}
                    </button>

                    <p className="mt-3">
                        Already have a business account?
                        <a href="#" className="mt-0 anc-link" onClick={() => handleTabChange("business-signin")}>Sign In</a>
                    </p>
                    <p className="mt-2">
                        Are you a customer?
                        <a href="/login" className="mt-0 anc-link">Customer Register</a>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default BusinessSignUp;
