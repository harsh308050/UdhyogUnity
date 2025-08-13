import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Eye,
    Calendar,
    Shield,
    AlertCircle,
    CheckCircle,
    Clock
} from 'react-feather';
import './SimpleSettings.css';

const DocumentsSettings = ({ businessData, onUpdate }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Document types configuration
    const documentTypes = [
        {
            id: 'business_license',
            name: 'Business License',
            required: true,
            description: 'Official business registration license'
        },
        {
            id: 'tax_registration',
            name: 'Tax Registration',
            required: true,
            description: 'GST/Tax registration certificate'
        },
        {
            id: 'identity_proof',
            name: 'Identity Proof',
            required: true,
            description: 'Government issued ID (Aadhar/PAN/Passport)'
        },
        {
            id: 'address_proof',
            name: 'Address Proof',
            required: true,
            description: 'Business address verification document'
        },
        {
            id: 'bank_statement',
            name: 'Bank Statement',
            required: false,
            description: 'Recent bank statements for verification'
        },
        {
            id: 'insurance_certificate',
            name: 'Insurance Certificate',
            required: false,
            description: 'Business insurance policy document'
        }
    ];

    // Mock documents data - replace with actual Firebase data
    const mockDocuments = [
        {
            id: '1',
            name: 'Business License',
            type: 'business_license',
            fileName: 'business_license.pdf',
            fileSize: '2.3 MB',
            uploadDate: '2024-01-15',
            status: 'verified',
            expiryDate: '2025-01-15',
            downloadUrl: '#',
            description: 'Official business registration license'
        },
        {
            id: '2',
            name: 'GST Registration',
            type: 'tax_registration',
            fileName: 'gst_certificate.pdf',
            fileSize: '1.8 MB',
            uploadDate: '2024-01-15',
            status: 'verified',
            expiryDate: null,
            downloadUrl: '#',
            description: 'GST registration certificate'
        },
        {
            id: '3',
            name: 'Aadhar Card',
            type: 'identity_proof',
            fileName: 'aadhar_card.pdf',
            fileSize: '1.2 MB',
            uploadDate: '2024-01-15',
            status: 'pending',
            expiryDate: null,
            downloadUrl: '#',
            description: 'Owner identity verification'
        },
        {
            id: '4',
            name: 'Bank Statement',
            type: 'bank_statement',
            fileName: 'bank_statement_dec2023.pdf',
            fileSize: '3.1 MB',
            uploadDate: '2024-01-10',
            status: 'rejected',
            expiryDate: null,
            downloadUrl: '#',
            description: 'December 2023 bank statement',
            rejectionReason: 'Document is older than 3 months. Please upload a recent statement.'
        }
    ];

    useEffect(() => {
        // Load documents from business data instead of mock data
        const loadDocumentsFromBusinessData = () => {
            console.log('Loading documents from business data:', businessData);
            setLoading(true);
            const documentsFromBusiness = [];

            // Government ID Document
            if (businessData.governmentId) {
                documentsFromBusiness.push({
                    id: 'gov_id',
                    name: 'Government ID',
                    type: 'identity_proof',
                    fileName: businessData.governmentId.original_name || 'government_id',
                    fileSize: 'N/A',
                    uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    status: businessData.isVerified ? 'verified' : 'pending',
                    expiryDate: null,
                    downloadUrl: businessData.governmentId.url || '#',
                    description: 'Government issued ID verification document',
                    cloudinaryData: businessData.governmentId
                });
            }

            // Business Verification Document
            if (businessData.verificationDocument) {
                documentsFromBusiness.push({
                    id: 'verification_doc',
                    name: 'Business Verification Document',
                    type: 'business_license',
                    fileName: businessData.verificationDocument.original_name || 'verification_document',
                    fileSize: 'N/A',
                    uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    status: businessData.isVerified ? 'verified' : 'pending',
                    expiryDate: null,
                    downloadUrl: businessData.verificationDocument.url || '#',
                    description: 'Business verification and registration document',
                    cloudinaryData: businessData.verificationDocument
                });
            }

            // Business Logo (if exists)
            if (businessData.logo) {
                documentsFromBusiness.push({
                    id: 'business_logo',
                    name: 'Business Logo',
                    type: 'profile_image',
                    fileName: businessData.logo.original_name || 'logo',
                    fileSize: 'N/A',
                    uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    status: 'verified',
                    expiryDate: null,
                    downloadUrl: businessData.logo.url || '#',
                    description: 'Business logo image',
                    cloudinaryData: businessData.logo
                });
            }

            // Business Cover Image (if exists)
            if (businessData.coverImage) {
                documentsFromBusiness.push({
                    id: 'cover_image',
                    name: 'Cover Image',
                    type: 'profile_image',
                    fileName: businessData.coverImage.original_name || 'cover',
                    fileSize: 'N/A',
                    uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    status: 'verified',
                    expiryDate: null,
                    downloadUrl: businessData.coverImage.url || '#',
                    description: 'Business cover image',
                    cloudinaryData: businessData.coverImage
                });
            }

            // Business Photos
            if (businessData.businessPhotos && Array.isArray(businessData.businessPhotos)) {
                businessData.businessPhotos.forEach((photo, index) => {
                    if (photo && photo.url) {
                        documentsFromBusiness.push({
                            id: `business_photo_${index + 1}`,
                            name: `Business Photo ${index + 1}`,
                            type: 'business_photos',
                            fileName: photo.original_name || `business_photo_${index + 1}`,
                            fileSize: 'N/A',
                            uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            status: 'verified',
                            expiryDate: null,
                            downloadUrl: photo.url || '#',
                            description: `Business photo ${index + 1}`,
                            cloudinaryData: photo
                        });
                    }
                });
            }

            // Introduction Video (if exists)
            if (businessData.introVideo) {
                documentsFromBusiness.push({
                    id: 'intro_video',
                    name: 'Introduction Video',
                    type: 'promotional_video',
                    fileName: businessData.introVideo.original_name || 'intro_video',
                    fileSize: 'N/A',
                    uploadDate: businessData.createdAt ? new Date(businessData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    status: 'verified',
                    expiryDate: null,
                    downloadUrl: businessData.introVideo.url || '#',
                    description: 'Business introduction video',
                    cloudinaryData: businessData.introVideo
                });
            }

            console.log('Documents loaded from business data:', documentsFromBusiness);
            setDocuments(documentsFromBusiness);
            setLoading(false);
        };

        loadDocumentsFromBusinessData();
    }, [businessData]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'verified':
                return <CheckCircle size={16} className="status-icon verified" />;
            case 'pending':
                return <Clock size={16} className="status-icon pending" />;
            case 'rejected':
                return <AlertCircle size={16} className="status-icon rejected" />;
            default:
                return <FileText size={16} className="status-icon" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified':
                return 'rgba(76, 175, 80, 0.2)';
            case 'pending':
                return 'rgba(255, 193, 7, 0.2)';
            case 'rejected':
                return 'rgba(220, 53, 69, 0.2)';
            default:
                return 'rgba(108, 117, 125, 0.2)';
        }
    };

    const getDocumentIcon = (document) => {
        const fileName = document.fileName?.toLowerCase() || '';
        const downloadUrl = document.downloadUrl || '';

        // Check if it's an image
        if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') ||
            downloadUrl.includes('.jpg') || downloadUrl.includes('.jpeg') || downloadUrl.includes('.png') ||
            document.type === 'profile_image' || document.type === 'business_photos') {
            return (
                <div className="document-preview">
                    <img
                        src={document.downloadUrl}
                        alt={document.name}
                        style={{
                            maxWidth: '22vw',
                            maxHeight: '200px',
                            objectFit: 'fill',
                            borderRadius: '8px'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <FileText size={24} style={{ display: 'none' }} />
                </div>
            );
        }

        // Check if it's a video
        if (fileName.includes('.mp4') || fileName.includes('.mov') || fileName.includes('.avi') ||
            document.type === 'promotional_video') {
            return (
                <div className="document-preview video-preview">
                    <div className="video-thumbnail">
                        <FileText size={24} />
                        <span className="video-label">Video</span>
                    </div>
                </div>
            );
        }

        // Default file icon
        return <FileText size={24} />;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDocumentTypeInfo = (typeId) => {
        return documentTypes.find(type => type.id === typeId) || {};
    };

    const getMissingRequiredDocuments = () => {
        const uploadedTypes = documents.map(doc => doc.type);
        return documentTypes.filter(type =>
            type.required && !uploadedTypes.includes(type.id)
        );
    };

    if (loading) {
        return (
            <div className="documents-loading">
                <div className="spinner"></div>
                <p>Loading documents...</p>
            </div>
        );
    }

    const missingDocs = getMissingRequiredDocuments();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="documents-settings"
        >
            <div className="documents-header">
                <h2>Business Documents</h2>
                <p>Your business documents are safe with us</p>
            </div>

            {/* Document Status Overview */}
            <div className="documents-overview">
                <div className="overview-stats">
                    <div className="stat-card">
                        <div className="stat-value">{documents.filter(d => d.status === 'verified').length}</div>
                        <div className="stat-label">Verified</div>
                        <CheckCircle className="stat-icon" style={{ color: '#4CAF50' }} />
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{documents.filter(d => d.status === 'pending').length}</div>
                        <div className="stat-label">Pending</div>
                        <Clock className="stat-icon" style={{ color: '#FFC107' }} />
                    </div>
                </div>

                {/* Business Verification Status */}
                <div className="verification-status">
                    <div className="status-header">
                        <div className="status-title">
                            <Shield size={20} />
                            <span>Business Verification Status</span>
                        </div>
                        <div className={`verification-badge ${businessData.isVerified ? 'verified' : 'pending'}`}>
                            {businessData.isVerified ? (
                                <>
                                    <CheckCircle size={16} />
                                    <span>Verified Business</span>
                                </>
                            ) : (
                                <>
                                    <Clock size={16} />
                                    <span>Verification Pending</span>
                                </>
                            )}
                        </div>
                    </div>

                    {businessData.verifiedAt && (
                        <div className="verification-date">
                            Verified on: {new Date(businessData.verifiedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Documents List */}
            <div className="documents-list">
                <div className="documents-grid">
                    {documents.map(document => (
                        <motion.div
                            key={document.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`document-card ${document.status}`}
                        >
                            <div className="document-header">
                                <div className="document-icon">
                                    {getDocumentIcon(document)}
                                </div>
                            </div>

                            <div className="document-info">
                                <h4>{document.name}</h4>
                                <p className="document-description">{document.description}</p>
                            </div>

                            <div className="document-details">
                                <div className="detail-row">
                                    <Calendar size={12} />
                                    <span>Uploaded: {formatDate(document.uploadDate)}</span>
                                </div>
                                <div className="detail-row">
                                    <div
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(document.status) }}
                                    >
                                        {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                                    </div>
                                </div>
                            </div>

                            {document.status === 'rejected' && (
                                <div className="rejection-reason">
                                    <AlertCircle size={14} />
                                    <small>{document.rejectionReason}</small>
                                </div>
                            )}

                            <div className="document-actions">
                                <button
                                    className="action-btn view"
                                    onClick={() => setSelectedDocument(document)}
                                    title="View Document"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default DocumentsSettings;
