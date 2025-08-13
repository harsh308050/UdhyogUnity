import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Camera, MapPin, Phone, Mail, Globe, Clock, Shield, Edit3, X, Check } from 'react-feather';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../Firebase/config';

const ProfileSettings = ({ businessData, onUpdate }) => {
    const [formData, setFormData] = useState({
        businessName: businessData?.businessName || '',
        email: businessData?.email || '',
        phone: businessData?.phone || '',
        address: businessData?.address || '',
        city: businessData?.city || '',
        state: businessData?.state || '',
        pincode: businessData?.pincode || '',
        website: businessData?.website || '',
        description: businessData?.description || '',
        businessHours: businessData?.businessHours || {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '10:00', close: '17:00', closed: false }
        },
        socialMedia: businessData?.socialMedia || {
            facebook: '',
            instagram: '',
            twitter: '',
            linkedin: ''
        }
    });

    const [isEditing, setIsEditing] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [logoPreview, setLogoPreview] = useState(null);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNestedInputChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleBusinessHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [day]: {
                    ...prev.businessHours[day],
                    [field]: value
                }
            }
        }));
    };

    const toggleEdit = (field) => {
        setIsEditing(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Here you would typically save to Firebase
            // For now, just simulate the save
            await new Promise(resolve => setTimeout(resolve, 1000));

            onUpdate(formData);
            setSavedMessage('Profile updated successfully!');
            setTimeout(() => setSavedMessage(''), 3000);
            setIsEditing({});
        } catch (error) {
            console.error('Error saving profile:', error);
            setSavedMessage('Error saving profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile-settings"
        >
            <div className="profile-header">
                <h2>Business Profile</h2>
                <p>Manage your business information and settings</p>
            </div>

            {savedMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`alert ${savedMessage.includes('Error') ? 'alert-error' : 'alert-success'}`}
                >
                    {savedMessage}
                </motion.div>
            )}

            <div className="profile-sections">
                {/* Business Logo Section */}
                <div className="profile-section">
                    <h3>Business Logo</h3>
                    <div className="logo-upload-section">
                        <div className="current-logo">
                            {logoPreview || businessData?.logo?.url ? (
                                <img
                                    src={logoPreview || businessData.logo.url}
                                    alt="Business Logo"
                                    className="logo-preview"
                                />
                            ) : (
                                <div className="logo-placeholder">
                                    <Camera size={32} />
                                    <span>{formData.businessName?.charAt(0) || 'B'}</span>
                                </div>
                            )}
                        </div>
                        <div className="logo-upload-controls">
                            <input
                                type="file"
                                id="logo-upload"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="logo-upload" className="btn btn-outline">
                                <Upload size={16} />
                                Upload New Logo
                            </label>
                            <p className="upload-hint">PNG, JPG up to 2MB</p>
                        </div>
                    </div>
                </div>

                {/* Basic Information Section */}
                <div className="profile-section">
                    <h3>Basic Information</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Business Name</label>
                            <div className="editable-field">
                                {isEditing.businessName ? (
                                    <div className="edit-input-group">
                                        <input
                                            type="text"
                                            name="businessName"
                                            value={formData.businessName}
                                            onChange={handleInputChange}
                                            className="form-control"
                                        />
                                        <button
                                            className="btn-icon btn-success"
                                            onClick={() => toggleEdit('businessName')}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-cancel"
                                            onClick={() => toggleEdit('businessName')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="display-field">
                                        <span>{formData.businessName || 'Not provided'}</span>
                                        <button
                                            className="btn-icon"
                                            onClick={() => toggleEdit('businessName')}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <div className="editable-field">
                                {isEditing.email ? (
                                    <div className="edit-input-group">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="form-control"
                                        />
                                        <button
                                            className="btn-icon btn-success"
                                            onClick={() => toggleEdit('email')}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-cancel"
                                            onClick={() => toggleEdit('email')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="display-field">
                                        <span>{formData.email || 'Not provided'}</span>
                                        <button
                                            className="btn-icon"
                                            onClick={() => toggleEdit('email')}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Phone</label>
                            <div className="editable-field">
                                {isEditing.phone ? (
                                    <div className="edit-input-group">
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="form-control"
                                        />
                                        <button
                                            className="btn-icon btn-success"
                                            onClick={() => toggleEdit('phone')}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-cancel"
                                            onClick={() => toggleEdit('phone')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="display-field">
                                        <span>{formData.phone || 'Not provided'}</span>
                                        <button
                                            className="btn-icon"
                                            onClick={() => toggleEdit('phone')}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Website</label>
                            <div className="editable-field">
                                {isEditing.website ? (
                                    <div className="edit-input-group">
                                        <input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleInputChange}
                                            className="form-control"
                                            placeholder="https://www.example.com"
                                        />
                                        <button
                                            className="btn-icon btn-success"
                                            onClick={() => toggleEdit('website')}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-cancel"
                                            onClick={() => toggleEdit('website')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="display-field">
                                        <span>{formData.website || 'Not provided'}</span>
                                        <button
                                            className="btn-icon"
                                            onClick={() => toggleEdit('website')}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Business Description</label>
                        <div className="editable-field">
                            {isEditing.description ? (
                                <div className="edit-input-group">
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="form-control"
                                        rows="4"
                                        placeholder="Describe your business..."
                                    />
                                    <div className="edit-buttons">
                                        <button
                                            className="btn-icon btn-success"
                                            onClick={() => toggleEdit('description')}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-cancel"
                                            onClick={() => toggleEdit('description')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="display-field">
                                    <p>{formData.description || 'No description provided'}</p>
                                    <button
                                        className="btn-icon"
                                        onClick={() => toggleEdit('description')}
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="profile-section">
                    <h3><MapPin size={20} /> Location</h3>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Street address"
                            />
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>State</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>PIN Code</label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleInputChange}
                                className="form-control"
                            />
                        </div>
                    </div>
                </div>

                {/* Business Hours Section */}
                <div className="profile-section">
                    <h3><Clock size={20} /> Business Hours</h3>
                    <div className="business-hours">
                        {days.map(day => (
                            <div key={day} className="day-hours">
                                <div className="day-name">
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
                                </div>
                                <div className="hours-controls">
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={formData.businessHours[day].closed}
                                            onChange={(e) => handleBusinessHoursChange(day, 'closed', e.target.checked)}
                                        />
                                        <span className="checkmark"></span>
                                        Closed
                                    </label>
                                    {!formData.businessHours[day].closed && (
                                        <div className="time-inputs">
                                            <input
                                                type="time"
                                                value={formData.businessHours[day].open}
                                                onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                                                className="time-input"
                                            />
                                            <span>to</span>
                                            <input
                                                type="time"
                                                value={formData.businessHours[day].close}
                                                onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                                                className="time-input"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Social Media Section */}
                <div className="profile-section">
                    <h3><Globe size={20} /> Social Media</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Facebook</label>
                            <input
                                type="url"
                                value={formData.socialMedia.facebook}
                                onChange={(e) => handleNestedInputChange('socialMedia', 'facebook', e.target.value)}
                                className="form-control"
                                placeholder="https://facebook.com/yourpage"
                            />
                        </div>
                        <div className="form-group">
                            <label>Instagram</label>
                            <input
                                type="url"
                                value={formData.socialMedia.instagram}
                                onChange={(e) => handleNestedInputChange('socialMedia', 'instagram', e.target.value)}
                                className="form-control"
                                placeholder="https://instagram.com/yourpage"
                            />
                        </div>
                        <div className="form-group">
                            <label>Twitter</label>
                            <input
                                type="url"
                                value={formData.socialMedia.twitter}
                                onChange={(e) => handleNestedInputChange('socialMedia', 'twitter', e.target.value)}
                                className="form-control"
                                placeholder="https://twitter.com/yourpage"
                            />
                        </div>
                        <div className="form-group">
                            <label>LinkedIn</label>
                            <input
                                type="url"
                                value={formData.socialMedia.linkedin}
                                onChange={(e) => handleNestedInputChange('socialMedia', 'linkedin', e.target.value)}
                                className="form-control"
                                placeholder="https://linkedin.com/company/yourpage"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="profile-actions">
                    <button
                        className="btn btn-primary save-btn"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <div className="spinner-small"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProfileSettings;
