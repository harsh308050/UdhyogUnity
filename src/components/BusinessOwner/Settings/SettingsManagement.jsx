import React, { useState, useEffect } from 'react';
import { User, Star, FileText, Settings as SettingsIcon, Save, Edit, Check, X } from 'react-feather';
import { getBusinessDataFromFirestore, updateBusinessDataInFirestore, getCurrentBusinessEmail } from '../../../Firebase/getBusinessData';
import DocumentsSettings from './DocumentsSettings';
import ReviewsSettings from './ReviewsSettings';
import './SimpleSettings.css';

const SettingsManagement = ({ businessData: propBusinessData }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [businessData, setBusinessData] = useState(propBusinessData || {});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Form states for each tab
    const [profileForm, setProfileForm] = useState({});
    const [isEditing, setIsEditing] = useState({});

    useEffect(() => {
        loadBusinessData();
    }, []);

    const loadBusinessData = async () => {
        try {
            setLoading(true);
            const email = getCurrentBusinessEmail();

            if (email) {
                const data = await getBusinessDataFromFirestore(email);
                if (data) {
                    setBusinessData(data);
                    setProfileForm(data);
                }
            } else if (propBusinessData) {
                setBusinessData(propBusinessData);
                setProfileForm(propBusinessData);
            }
        } catch (error) {
            console.error("Error loading business data:", error);
            setMessage('Error loading business data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (field, value) => {
        try {
            setSaving(true);
            const email = getCurrentBusinessEmail();

            if (email) {
                const updateData = { [field]: value };
                await updateBusinessDataInFirestore(email, updateData);

                setBusinessData(prev => ({ ...prev, [field]: value }));
                setIsEditing(prev => ({ ...prev, [field]: false }));
                setMessage('Settings saved successfully');

                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error("Error saving data:", error);
            setMessage('Error saving data');
        } finally {
            setSaving(false);
        }
    };

    const toggleEdit = (field) => {
        setIsEditing(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const renderProfileTab = () => (
        <div className="settings-tab-content">
            <h3>Business Profile</h3>

            {/* Business Name */}
            <div className="setting-item">
                <label>Business Name</label>
                <div className="setting-field">
                    {isEditing.businessName ? (
                        <input
                            type="text"
                            value={profileForm.businessName || ''}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                            className="form-control"
                        />
                    ) : (
                        <span className="field-value">{businessData.businessName || 'Not set'}</span>
                    )}
                    <div className="field-actions">
                        {isEditing.businessName ? (
                            <>
                                <button
                                    onClick={() => handleSave('businessName', profileForm.businessName)}
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => toggleEdit('businessName')}
                                    className="btn-cancel"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => toggleEdit('businessName')}
                                className="btn-edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Email */}
            <div className="setting-item">
                <label>Email</label>
                <div className="setting-field">
                    <span className="field-value">{businessData.email || 'Not set'}</span>
                    <small className="field-note">Email cannot be changed</small>
                </div>
            </div>

            {/* Phone */}
            <div className="setting-item">
                <label>Phone Number</label>
                <div className="setting-field">
                    {isEditing.phoneNumber ? (
                        <input
                            type="tel"
                            value={profileForm.phoneNumber || ''}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            className="form-control"
                        />
                    ) : (
                        <span className="field-value">{businessData.phoneNumber || 'Not set'}</span>
                    )}
                    <div className="field-actions">
                        {isEditing.phoneNumber ? (
                            <>
                                <button
                                    onClick={() => handleSave('phoneNumber', profileForm.phoneNumber)}
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => toggleEdit('phoneNumber')}
                                    className="btn-cancel"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => toggleEdit('phoneNumber')}
                                className="btn-edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className="setting-item">
                <label>Address</label>
                <div className="setting-field">
                    {isEditing.address ? (
                        <textarea
                            value={profileForm.address || ''}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                            className="form-control"
                            rows="3"
                        />
                    ) : (
                        <span className="field-value">{businessData.address || 'Not set'}</span>
                    )}
                    <div className="field-actions">
                        {isEditing.address ? (
                            <>
                                <button
                                    onClick={() => handleSave('address', profileForm.address)}
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => toggleEdit('address')}
                                    className="btn-cancel"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => toggleEdit('address')}
                                className="btn-edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Business Type */}
            <div className="setting-item">
                <label>Business Type</label>
                <div className="setting-field">
                    <span className="field-value">{businessData.businessType || 'Not set'}</span>
                    <small className="field-note">Business type cannot be changed</small>
                </div>
            </div>

            {/* Description */}
            <div className="setting-item">
                <label>Description</label>
                <div className="setting-field">
                    {isEditing.description ? (
                        <textarea
                            value={profileForm.description || ''}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                            className="form-control"
                            rows="4"
                            placeholder="Describe your business..."
                        />
                    ) : (
                        <span className="field-value">{businessData.description || 'Not set'}</span>
                    )}
                    <div className="field-actions">
                        {isEditing.description ? (
                            <>
                                <button
                                    onClick={() => handleSave('description', profileForm.description)}
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => toggleEdit('description')}
                                    className="btn-cancel"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => toggleEdit('description')}
                                className="btn-edit"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReviewsTab = () => (
        <div className="settings-tab-content">
            <ReviewsSettings
                businessData={businessData}
                onUpdate={(updates) => setBusinessData(prev => ({ ...prev, ...updates }))}
            />
        </div>
    );

    const renderDocumentsTab = () => (
        <DocumentsSettings
            businessData={businessData}
            onUpdate={(updates) => {
                setBusinessData(prev => ({ ...prev, ...updates }));
            }}
        />
    );

    if (loading) {
        return (
            <div className="settings-loading">
                <div className="spinner"></div>
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>Settings</h2>
                {message && (
                    <div className={`settings-message ${message.includes('Error') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}
            </div>

            <div className="settings-tabs">
                <button
                    className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <User size={20} />
                    Profile
                </button>
                <button
                    className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    <Star size={20} />
                    Reviews
                </button>
                <button
                    className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >
                    <FileText size={20} />
                    Documents
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'reviews' && renderReviewsTab()}
                {activeTab === 'documents' && renderDocumentsTab()}
            </div>
        </div>
    );
};

export default SettingsManagement;
