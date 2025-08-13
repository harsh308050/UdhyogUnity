import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

const BusinessDetailsForm = ({ formData, updateFormData, onNext }) => {
  const [errors, setErrors] = useState({});
  const [charCount, setCharCount] = useState(formData.description ? formData.description.length : 0);

  const businessTypes = [
    'Service', 'Product'
  ];

  const categoryOptions = [
    'Electronics', 'Fashion', 'Home Decor', 'Food & Beverages', 'Beauty & Personal Care',
    'Health & Wellness', 'Education & Training', 'Professional Services', 'Arts & Crafts',
    'Sports & Fitness', 'Travel & Tourism', 'Entertainment', 'Automotive', 'Real Estate'
  ];

  const onDropLogo = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = () => {
        updateFormData({ logo: reader.result });
      };

      reader.readAsDataURL(file);
    }
  }, [updateFormData]);

  const onDropCover = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = () => {
        updateFormData({ coverImage: reader.result });
      };

      reader.readAsDataURL(file);
    }
  }, [updateFormData]);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
    onDrop: onDropLogo,
    accept: {
      'image/jpeg': [],
      'image/png': []
    },
    maxFiles: 1
  });

  const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps } = useDropzone({
    onDrop: onDropCover,
    accept: {
      'image/jpeg': [],
      'image/png': []
    },
    maxFiles: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });

    if (name === 'description') {
      setCharCount(value.length);
    }
  };

  const toggleCategory = (category) => {
    const updatedCategories = formData.categories.includes(category)
      ? formData.categories.filter(c => c !== category)
      : [...formData.categories, category];

    updateFormData({ categories: updatedCategories });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    if (!formData.businessName) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Please select a business type';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    if (formData.categories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }

    if (!formData.logo) {
      newErrors.logo = 'Please upload a business logo';
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
      <h2 className="text-center mb-4">Tell Us About Your Business</h2>

      <div className="row">
        <div className="col-md-12">
          <div className="neumorphic-card">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="businessName" className="form-label">Business Name*</label>
                <input
                  type="text"
                  className="form-control"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Enter your business name"
                />
                {errors.businessName && <div className="error-message">{errors.businessName}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="businessType" className="form-label">Business Type*</label>
                <select
                  className="form-select"
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                >
                  <option value="">Select business type</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.businessType && <div className="error-message">{errors.businessType}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">Short Description*</label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  style={{ height: 'auto' }}
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your business (100-500 characters)"
                ></textarea>
                <div className="character-count">
                  {charCount}/500 characters
                </div>
                {errors.description && <div className="error-message">{errors.description}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Business Categories*</label>
                <div className="chip-container">
                  {categoryOptions.map((category) => (
                    <div
                      key={category}
                      className={`chip ${formData.categories.includes(category) ? 'selected' : ''}`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                      {formData.categories.includes(category) && (
                        <X size={14} />
                      )}
                    </div>
                  ))}
                </div>
                {errors.categories && <div className="error-message">{errors.categories}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="operatingSince" className="form-label">Operating Since (Optional)</label>
                <input
                  type="number"
                  className="form-control"
                  id="operatingSince"
                  name="operatingSince"
                  value={formData.operatingSince}
                  onChange={handleChange}
                  placeholder="Enter year (e.g., 2020)"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Upload Logo*</label>
                <div {...getLogoRootProps()} className="dropzone">
                  <input {...getLogoInputProps()} />
                  {formData.logo ? (
                    <div className="text-center">
                      <img
                        src={formData.logo}
                        alt="Business Logo"
                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
                      />
                      <p className="mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={40} className="mb-2" />
                      <p>Click or drag and drop your logo here</p>
                      <p className="text-muted small">PNG or JPG (Max 2MB)</p>
                    </div>
                  )}
                </div>
                {errors.logo && <div className="error-message">{errors.logo}</div>}
              </div>

              <div className="mb-4">
                <label className="form-label">Upload Cover Image (Optional)</label>
                <div {...getCoverRootProps()} className="dropzone">
                  <input {...getCoverInputProps()} />
                  {formData.coverImage ? (
                    <div className="text-center">
                      <img
                        src={formData.coverImage}
                        alt="Cover"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <p className="mt-2">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={40} className="mb-2" />
                      <p>Click or drag and drop your cover image here</p>
                      <p className="text-muted small">PNG or JPG (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button type="submit" className="btn btn-primary">
                  Next Step
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BusinessDetailsForm;