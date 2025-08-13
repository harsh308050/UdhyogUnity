import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, Edit, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { addBusinessToFirestore } from '../../../Firebase/addBusiness';
import { uploadToCloudinary, formatCloudinaryFolder } from '../../../Firebase/cloudinary';
import { businessSignUp } from '../../../Firebase/businessAuth';
import { linkBusinessRegistrationToUser } from '../../../Firebase/businessDb';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';

const FinalReviewForm = ({ formData, updateFormData, onPrevious }) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    updateFormData({ [name]: checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.termsAgreed) newErrors.termsAgreed = 'You must accept the terms and conditions';
    if (!formData.detailsConfirmed) newErrors.detailsConfirmed = 'You must confirm that all details are accurate';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsSubmitting(true);
    try {
      // Sanitize business name for IDs
      const businessId = formData.businessName?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'business_' + Date.now();
      const cloudinaryBase = 'UdhyogUnity'; // Cloudinary preset/base folder

      // Helper to get file extension from a file or base64 string
      const getFileExtension = (fileOrUrl, fallbackExt = '') => {
        if (fileOrUrl && fileOrUrl.name) {
          const parts = fileOrUrl.name.split('.');
          if (parts.length > 1) return '.' + parts.pop();
        }
        if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('data:')) {
          const match = fileOrUrl.match(/^data:(image|video|application)\/(\w+);/);
          if (match) return '.' + match[2];
        }
        return fallbackExt;
      };

      // Helper to upload a file or base64 string with correct folder structure
      const uploadFile = async (fileOrUrl, folderType, public_id) => {
        if (!fileOrUrl) return null;
        if (typeof fileOrUrl === 'object' && fileOrUrl.url && fileOrUrl.public_id) return fileOrUrl;

        let fileBlob, ext = '';
        if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('https://res.cloudinary.com'))
          return { url: fileOrUrl, public_id, original_name: public_id };

        if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('data:')) {
          ext = getFileExtension(fileOrUrl);
          const res = await fetch(fileOrUrl);
          fileBlob = await res.blob();
        } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
          ext = fileOrUrl.name ? getFileExtension(fileOrUrl) : '';
          fileBlob = fileOrUrl;
        } else if (fileOrUrl.preview) {
          ext = getFileExtension(fileOrUrl, '');
          const res = await fetch(fileOrUrl.preview);
          fileBlob = await res.blob();
        } else {
          return null;
        }

        // Create proper folder structure: UdhyogUnity/businessId/Profile or Verification
        const folder = `${cloudinaryBase}/${businessId}/${folderType}`;
        // Format the folder path correctly for Cloudinary (no leading/trailing slashes)
        const formattedFolder = formatCloudinaryFolder(folder);

        // Use meaningful public_id with extension (don't include folder in public_id)
        const publicIdWithExt = ext ? `${public_id}${ext}` : public_id;

        // For more reliable folder structure, use the full path as the public_id
        const fullPathPublicId = `${formattedFolder}/${publicIdWithExt}`;

        console.log(`Uploading file '${publicIdWithExt}' using full path: ${fullPathPublicId}`);

        try {
          // Use the full path as public_id for reliable folder structure
          const result = await uploadToCloudinary(fileBlob, '', fullPathPublicId);
          console.log('Upload successful:', {
            url: result.url,
            public_id: result.public_id,
            folder: result.folder,
            full_path: result.full_path,
            file_name: result.file_name || publicIdWithExt
          });
          return result;
        } catch (error) {
          console.error(`Failed to upload ${public_id}:`, error);
          throw error;
        }
      };

      // Upload all files in parallel with proper folder structure
      console.log(`Starting all file uploads with business ID: ${businessId}`);

      let logoObj, coverObj, govIdObj, verifDocObj, introVideoObj, businessPhotosArr;

      try {
        [logoObj, coverObj, govIdObj, verifDocObj, introVideoObj, businessPhotosArr] = await Promise.all([
          // Profile folder for logo and cover
          uploadFile(formData.logo, 'Profile', 'logo'),
          uploadFile(formData.coverImage, 'Profile', 'cover'),

          // Verification folder for all verification documents
          uploadFile(formData.governmentId?.preview || formData.governmentId, 'Verification', 'governmentId'),
          uploadFile(formData.verificationDocument?.preview || formData.verificationDocument, 'Verification', 'verificationDocument'),
          uploadFile(formData.introVideo?.preview || formData.introVideo, 'Verification', 'introVideo'),
          formData.businessPhotos && Array.isArray(formData.businessPhotos)
            ? Promise.all(formData.businessPhotos.map((photo, idx) =>
              uploadFile(photo.preview || photo, 'Verification', `businessPhoto_${idx + 1}`)))
            : []
        ]);

        console.log('All uploads completed successfully:', {
          logo: logoObj?.url,
          cover: coverObj?.url,
          govId: govIdObj?.url,
          verifDoc: verifDocObj?.url,
          introVideo: introVideoObj?.url,
          photos: businessPhotosArr?.length
        });
      } catch (uploadError) {
        console.error('Error during file uploads:', uploadError);
        setIsSubmitting(false);
        setErrors({ submit: 'Failed to upload files. Please try again.' });
        return;
      }

      // Helper function to safely extract file data
      const safeFileData = (fileObj) => {
        if (!fileObj) return null;

        const data = {};
        if (fileObj.url) data.url = fileObj.url;
        if (fileObj.public_id) data.public_id = fileObj.public_id;
        if (fileObj.original_name) data.original_name = fileObj.original_name;
        if (fileObj.folder) data.folder = fileObj.folder;
        if (fileObj.full_path) data.full_path = fileObj.full_path;

        // Only return the object if it has at least a URL
        return data.url ? data : null;
      };

      // Prepare Firestore data (no nested objects, only plain objects/arrays)
      const dataToSave = {
        ...formData,
        businessId: businessId, // Add the business ID
        logo: safeFileData(logoObj),
        coverImage: safeFileData(coverObj),
        governmentId: safeFileData(govIdObj),
        verificationDocument: safeFileData(verifDocObj),
        introVideo: safeFileData(introVideoObj),
        businessPhotos: Array.isArray(businessPhotosArr)
          ? businessPhotosArr
            .map(photo => safeFileData(photo))
            .filter(photo => photo !== null)
          : []
      };

      // Remove any file objects or base64 data to avoid Firestore errors
      if (typeof dataToSave.logo === 'string') delete dataToSave.logo;
      if (typeof dataToSave.coverImage === 'string') delete dataToSave.coverImage;

      // Save to Firestore using businessId as document ID
      try {
        console.log('Saving business data to Firestore with ID:', businessId);
        console.log('Folder structure used for uploads:');
        console.log(`- Logo/Cover: UdhyogUnity/${businessId}/Profile/`);
        console.log(`- Verification docs: UdhyogUnity/${businessId}/Verification/`);

        if (logoObj) console.log('Logo path:', logoObj.full_path || logoObj.public_id);
        if (coverObj) console.log('Cover path:', coverObj.full_path || coverObj.public_id);

        // Save business registration data to Businesses collection
        await addBusinessToFirestore(dataToSave);
        console.log('Business data saved to Firestore successfully with ID:', businessId);

        // Ensure there's a business user account in BusinessUsers collection
        // This creates the authentication record needed for dashboard access
        try {
          const { addBusinessUserToFirestore } = await import('../../../Firebase/businessDb');

          // Create/update business user record for authentication
          const businessUserData = {
            email: formData.email,
            businessName: formData.businessName,
            contactPerson: formData.ownerName,
            phone: formData.phoneNumber?.startsWith('+91') ? formData.phoneNumber : `+91${formData.phoneNumber}`,
            businessType: formData.businessType,
            isVerified: true,
            isBusinessRegistered: true,
            status: 'active',
            createdAt: new Date().toISOString()
          };

          // Create a mock user object for the addBusinessUserToFirestore function
          const mockUser = { email: formData.email };
          await addBusinessUserToFirestore(mockUser, businessUserData);
          console.log('Business user account created/updated successfully');
        } catch (userError) {
          console.error('Error creating business user account:', userError);
          // Continue with the flow even if this fails
        }

        setIsSubmitting(false);

        // Redirect to business login with a success message instead of directly to dashboard
        // This ensures proper authentication flow
        navigate('/business-login?registered=true');
      } catch (firestoreError) {
        console.error('Failed to save business data to Firestore:', firestoreError);
        setIsSubmitting(false);
        setErrors({ submit: 'Failed to save business data. Please try again.' });
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrors({ submit: `Registration failed: ${err.message || 'Unknown error'}` });
      console.error('Business registration error:', err);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center success-animation"
      >
        {showConfetti && (
          <div className="confetti-container">
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={500}
            />
          </div>
        )}

        <div className="success-icon mb-4">
          <Check size={80} className="text-success" />
        </div>

        <h2 className="success-message">Registration Completed Successfully! 🎉</h2>
        <p className="mt-3">
          Welcome to UdhyogUnity! Your business has been registered successfully.
        </p>

        <div className="alert alert-success mt-4">
          <p className="mb-1"><strong>You're all set!</strong></p>
          <p className="mb-0">
            Your business is now active on our platform. You can access your dashboard
            to manage your business, receive customer requests, and grow your business.
          </p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="btn btn-primary me-3"
            onClick={() => navigate('/business-login')}
          >
            Go to Business Login
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="form-step"
    >
      <h2 className="text-center mb-4">Final Review Before Submission</h2>

      <div className="neumorphic-card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Business Details</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex mb-3">
                    {formData.logo && (
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          backgroundImage: `url(${formData.logo})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          marginRight: '15px'
                        }}
                      ></div>
                    )}
                    <div>
                      <h5>{formData.businessName}</h5>
                      <p className="text-muted mb-0">{formData.businessType}</p>
                    </div>
                  </div>

                  <p className="mb-3">{formData.description}</p>

                  <div className="mb-3">
                    <strong>Categories:</strong>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {formData.categories.map(category => (
                        <span key={category} className="badge bg-light text-dark">{category}</span>
                      ))}
                    </div>
                  </div>

                  {formData.operatingSince && (
                    <p className="mb-0"><strong>Operating Since:</strong> {formData.operatingSince}</p>
                  )}
                </div>
              </div>

              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Contact & Location</h5>

                </div>
                <div className="card-body">
                  <p><strong>Owner:</strong> {formData.ownerName}</p>

                  <p className="d-flex align-items-center mb-2">
                    <Phone size={16} className="me-2" /> +91{formData.phoneNumber}
                  </p>

                  <p className="d-flex align-items-center mb-2">
                    <Mail size={16} className="me-2" /> {formData.email}
                  </p>

                  <p className="d-flex align-items-start mb-2">
                    <MapPin size={16} className="me-2 mt-1" />
                    <span>{formData.address}</span>
                  </p>

                  <p><strong>Service Area:</strong> {formData.serviceArea}</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Verification Documents</h5>

                </div>
                <div className="card-body">
                  {formData.governmentId && (
                    <p><strong>Government ID:</strong> {formData.governmentId.name}</p>
                  )}

                  {formData.verificationDocument && (
                    <p><strong>Verification Document:</strong> {formData.verificationDocument.name}</p>
                  )}

                  <p><strong>Business Photos:</strong> {formData.businessPhotos.length} uploaded</p>

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {formData.businessPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          backgroundImage: `url(${photo.preview})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      ></div>
                    ))}
                  </div>

                  {formData.introVideo && (
                    <p className="mt-3"><strong>Introduction Video:</strong> {formData.introVideo.name}</p>
                  )}
                </div>
              </div>

              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Payment Setup</h5>

                </div>
                <div className="card-body">
                  <p><strong>Accepted Payment Methods:</strong></p>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {formData.paymentMethods.map(method => (
                      <span key={method} className="badge bg-light text-dark d-flex align-items-center">
                        <CreditCard size={14} className="me-1" /> {method.charAt(0).toUpperCase() + method.slice(1)}
                      </span>
                    ))}
                  </div>

                  {formData.upiId && (
                    <p><strong>UPI ID:</strong> {formData.upiId}</p>
                  )}

                  {formData.bankDetails && (
                    <p><strong>Bank Details:</strong> ******** (Encrypted)</p>
                  )}

                  <p>
                    <strong>UdhyogUnity Payment Processing:</strong>
                    {formData.useUdhyogUnityPayment ? ' Enabled' : ' Disabled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="detailsConfirmed"
                name="detailsConfirmed"
                checked={formData.detailsConfirmed}
                onChange={handleToggleChange}
              />
              <label className="form-check-label" htmlFor="detailsConfirmed">
                I confirm that all details provided are accurate and complete.
              </label>
              {errors.detailsConfirmed && <div className="error-message">{errors.detailsConfirmed}</div>}
            </div>

            <div className="form-check mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="termsAgreed"
                name="termsAgreed"
                checked={formData.termsAgreed}
                onChange={handleToggleChange}
              />
              <label className="form-check-label" htmlFor="termsAgreed">
                I accept UdhyogUnity's <a href="#" className="text-decoration-none">Terms & Conditions</a> and <a href="#" className="text-decoration-none">Privacy Policy</a>.
              </label>
              {errors.termsAgreed && <div className="error-message">{errors.termsAgreed}</div>}
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onPrevious}
            >
              <ArrowLeft size={16} className="me-2" /> Previous
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={16} className="me-2" /> Submit Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default FinalReviewForm;