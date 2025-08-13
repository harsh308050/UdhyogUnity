import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import { FileText, Camera, Upload, X, Film, ArrowLeft, ArrowRight } from 'lucide-react';

const BusinessVerificationForm = ({ formData, updateFormData, onNext, onPrevious }) => {
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef(null);
  
  const documentTypes = [
    'Aadhar Card', 'Passport', 'Business License', 
    'Electricity Bill', 'GST Certificate', 'Business Registration Certificate'
  ];
  
  const onDropGovId = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      simulateUpload('governmentId', file);
    }
  }, []);
  
  const onDropVerificationDoc = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      simulateUpload('verificationDocument', file);
    }
  }, []);
  
  const onDropPhotos = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const newPhotos = [...formData.businessPhotos];
      
      acceptedFiles.forEach(file => {
        if (newPhotos.length < 5) {
          const reader = new FileReader();
          
          reader.onload = () => {
            newPhotos.push({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              preview: reader.result,
              name: file.name
            });
            updateFormData({ businessPhotos: newPhotos });
          };
          
          reader.readAsDataURL(file);
        }
      });
    }
  }, [formData.businessPhotos, updateFormData]);
  
  const onDropVideo = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      simulateUpload('introVideo', file);
    }
  }, []);
  
  const simulateUpload = (field, file) => {
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));
    
    const reader = new FileReader();
    
    reader.onload = () => {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [field]: progress }));
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Update form data after "upload" completes
          updateFormData({ 
            [field]: {
              name: file.name,
              type: file.type,
              size: file.size,
              preview: reader.result
            } 
          });
        }
      }, 300);
    };
    
    reader.readAsDataURL(file);
  };
  
  const removePhoto = (photoId) => {
    const updatedPhotos = formData.businessPhotos.filter(photo => photo.id !== photoId);
    updateFormData({ businessPhotos: updatedPhotos });
  };
  
  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (imageSrc) {
        const newPhotos = [...formData.businessPhotos];
        
        if (newPhotos.length < 5) {
          newPhotos.push({
            id: Date.now() + Math.random().toString(36).substring(2, 9),
            preview: imageSrc,
            name: 'Webcam Capture'
          });
          
          updateFormData({ businessPhotos: newPhotos });
        }
      }
    }
  };
  
  const { getRootProps: getGovIdRootProps, getInputProps: getGovIdInputProps } = useDropzone({
    onDrop: onDropGovId,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': []
    },
    maxFiles: 1
  });
  
  const { getRootProps: getVerificationDocRootProps, getInputProps: getVerificationDocInputProps } = useDropzone({
    onDrop: onDropVerificationDoc,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'application/pdf': []
    },
    maxFiles: 1
  });
  
  const { getRootProps: getPhotosRootProps, getInputProps: getPhotosInputProps } = useDropzone({
    onDrop: onDropPhotos,
    accept: {
      'image/jpeg': [],
      'image/png': []
    },
    maxFiles: 5
  });
  
  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop: onDropVideo,
    accept: {
      'video/mp4': [],
      'video/quicktime': []
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    
    if (!formData.governmentId) {
      newErrors.governmentId = 'Government ID is required';
    }
    
    if (!formData.verificationDocument) {
      newErrors.verificationDocument = 'At least one verification document is required';
    }
    
    if (formData.businessPhotos.length < 3) {
      newErrors.businessPhotos = 'Please upload at least 3 business photos';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="form-step"
    >
      <h2 className="text-center mb-4">Verify Your Business</h2>
      
      <div className="neumorphic-card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label">Government ID Upload*</label>
                <div {...getGovIdRootProps()} className="dropzone">
                  <input {...getGovIdInputProps()} />
                  {formData.governmentId ? (
                    <div className="text-center">
                      <FileText size={40} className="mb-2" />
                      <p>{formData.governmentId.name}</p>
                      <p className="text-muted small">
                        {(formData.governmentId.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={40} className="mb-2" />
                      <p>Upload Government ID (Aadhar, Passport, etc.)</p>
                      <p className="text-muted small">PDF, PNG or JPG (Max 5MB)</p>
                    </div>
                  )}
                </div>
                {uploadProgress.governmentId !== undefined && uploadProgress.governmentId < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress.governmentId}%` }}
                    ></div>
                  </div>
                )}
                {errors.governmentId && <div className="error-message">{errors.governmentId}</div>}
              </div>
              
              <div className="mb-4">
                <label className="form-label">Business Verification Document*</label>
                <select className="form-select mb-3">
                  <option value="">Select document type</option>
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div {...getVerificationDocRootProps()} className="dropzone">
                  <input {...getVerificationDocInputProps()} />
                  {formData.verificationDocument ? (
                    <div className="text-center">
                      <FileText size={40} className="mb-2" />
                      <p>{formData.verificationDocument.name}</p>
                      <p className="text-muted small">
                        {(formData.verificationDocument.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={40} className="mb-2" />
                      <p>Upload Verification Document</p>
                      <p className="text-muted small">PDF, PNG or JPG (Max 5MB)</p>
                    </div>
                  )}
                </div>
                {uploadProgress.verificationDocument !== undefined && uploadProgress.verificationDocument < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress.verificationDocument}%` }}
                    ></div>
                  </div>
                )}
                {errors.verificationDocument && <div className="error-message">{errors.verificationDocument}</div>}
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">Business Photos* (3-5)</label>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setShowWebcam(!showWebcam)}
                  >
                    <Camera size={14} className="me-1" /> {showWebcam ? 'Hide Camera' : 'Use Camera'}
                  </button>
                </div>
                
                {showWebcam && (
                  <div className="webcam-container mb-3">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width="100%"
                      videoConstraints={{
                        facingMode: "user"
                      }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary mt-2 w-100"
                      onClick={capturePhoto}
                    >
                      <Camera size={16} className="me-2" /> Capture Photo
                    </button>
                  </div>
                )}
                
                <div {...getPhotosRootProps()} className="dropzone">
                  <input {...getPhotosInputProps()} />
                  <div className="text-center">
                    <Upload size={40} className="mb-2" />
                    <p>Upload 3-5 Photos of Your Business</p>
                    <p className="text-muted small">PNG or JPG (Max 5MB each)</p>
                  </div>
                </div>
                
                {formData.businessPhotos.length > 0 && (
                  <div className="upload-preview">
                    {formData.businessPhotos.map((photo) => (
                      <div key={photo.id} className="upload-preview-item">
                        <img src={photo.preview} alt="Business" />
                        <div 
                          className="remove-btn"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.businessPhotos && <div className="error-message">{errors.businessPhotos}</div>}
              </div>
              
              <div className="mb-4">
                <label className="form-label">Short Introduction Video (Optional)</label>
                <div {...getVideoRootProps()} className="dropzone">
                  <input {...getVideoInputProps()} />
                  {formData.introVideo ? (
                    <div className="text-center">
                      <Film size={40} className="mb-2" />
                      <p>{formData.introVideo.name}</p>
                      <p className="text-muted small">
                        {(formData.introVideo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Film size={40} className="mb-2" />
                      <p>Upload a Short Introduction Video (10-20 sec)</p>
                      <p className="text-muted small">MP4 or MOV (Max 50MB)</p>
                    </div>
                  )}
                </div>
                {uploadProgress.introVideo !== undefined && uploadProgress.introVideo < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="upload-progress-bar" 
                      style={{ width: `${uploadProgress.introVideo}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-between mt-3">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onPrevious}
            >
              <ArrowLeft size={16} className="me-2" /> Previous
            </button>
            <button type="submit" className="btn btn-primary">
              Next <ArrowRight size={16} className="ms-2" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default BusinessVerificationForm;