import React from "react";
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

                        <div className="mb-3">
                            <label className="form-label">City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                value={userData.city}
                                onChange={e => setUserData({ ...userData, city: e.target.value })}
                                required
                                placeholder="Enter your city"
                            />
                        </div>
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
                            disabled={loading || !userData.city || !userData.phone}
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
