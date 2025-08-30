import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Eye,
    Calendar,
    AlertCircle,
    CheckCircle,
    Clock
} from 'react-feather';
import './SimpleSettings.css';
import './DocumentsSettings.css';

const DocumentsSettings = ({ businessData, onUpdate }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Document types are defined elsewhere or can be added later if needed

    // (mock data removed) documents are loaded from `businessData`

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

    // document type lookup is available via `documentTypes` if needed

    // Determine file type based on filename or download URL
    const detectFileType = (doc) => {
        const url = (doc.downloadUrl || doc.cloudinaryData?.url || doc.cloudinaryData?.secure_url || '').toString().toLowerCase();
        const name = (doc.fileName || url || '').toString().toLowerCase();
        const ext = name.split('.').pop();
        if (!ext && url.includes('data:')) {
            if (url.includes('image/')) return 'image';
            if (url.includes('video/')) return 'video';
        }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
        if (['mp4', 'webm', 'mov', 'ogg'].includes(ext)) return 'video';
        if (ext === 'pdf') return 'pdf';
        return 'other';
    };

    // Close viewer helper
    const closeViewer = () => setSelectedDocument(null);

    // Close on escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') closeViewer(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (loading) {
        return (
            <div className="documents-loading">
                <div className="spinner"></div>
                <p>Loading documents...</p>
            </div>
        );
    }

    // const missingDocs = getMissingRequiredDocuments(); // not currently used

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
                        <CheckCircle className="stat-icon" style={{ padding: '8px', color: 'white' }} />
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{documents.filter(d => d.status === 'pending').length}</div>
                        <div className="stat-label">Pending</div>
                        <Clock className="stat-icon" style={{ padding: '8px', color: 'white' }} />
                    </div>
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
            {/* Document Viewer Modal */}
            <AnimatePresence>
                {selectedDocument && (
                    <motion.div
                        className="docviewer-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeViewer}
                    >
                        <motion.div
                            className="docviewer-content"
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            exit={{ y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="docviewer-header">
                                <h3>{selectedDocument.name}</h3>
                                <button className="docviewer-close" onClick={closeViewer}>×</button>
                            </div>
                            <div className="docviewer-body">
                                {(() => {
                                    const type = detectFileType(selectedDocument);
                                    const url = selectedDocument.downloadUrl || selectedDocument.cloudinaryData?.secure_url || selectedDocument.cloudinaryData?.url || selectedDocument.fileUrl || '';

                                    if (type === 'image' && url) {
                                        return <img src={url} alt={selectedDocument.name} className="docviewer-image" />;
                                    }

                                    if (type === 'video' && url) {
                                        return (
                                            <video controls className="docviewer-video">
                                                <source src={url} />
                                                Your browser does not support the video tag.
                                            </video>
                                        );
                                    }

                                    if (type === 'pdf' && url) {
                                        return (
                                            <iframe title={selectedDocument.name} src={url} className="docviewer-iframe" />
                                        );
                                    }

                                    // Fallback: show download/open link
                                    return (
                                        <div className="docviewer-fallback">
                                            {url ? (
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="open-link">Open / Download</a>
                                            ) : (
                                                <p>No file URL provided.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default DocumentsSettings;
