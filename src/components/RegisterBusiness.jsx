import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import BusinessDetailsForm from './miniComponents/BusinessForm/BusinessDetailsForm';
import ContactLocationForm from './miniComponents/BusinessForm/ContactLocationForm';
import BusinessVerificationForm from './miniComponents/BusinessForm/BusinessVerificationForm';
import PaymentSetupForm from './miniComponents/BusinessForm/PaymentSetupForm';
import FinalReviewForm from './miniComponents/BusinessForm/FinalReviewForm';
import Stepper from './miniComponents/BusinessForm/Stepper';
import './styles/RegisterBusiness.css';

const RegisterBusiness = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Business Details
    businessName: '',
    businessType: '',
    description: '',
    categories: [],
    operatingSince: '',
    logo: null,
    coverImage: null,

    // Contact & Location
    ownerName: '', // Auto-filled from login profile
    phoneNumber: '',
    email: '', // Auto-filled from login profile
    address: '',
    serviceArea: '',
    location: { lat: 28.6139, lng: 77.2090 },

    // Verification
    governmentId: null,
    verificationDocument: null,
    businessPhotos: [],
    introVideo: null,

    // Payment Setup
    paymentMethods: [],
    upiId: '',
    bankDetails: '',
    useUdhyogUnityPayment: false,

    // Terms
    termsAgreed: false,
    detailsConfirmed: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('register-business-page');
    return () => {
      document.body.classList.remove('register-business-page');
    };
  }, []);

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const updateFormData = (stepData) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessDetailsForm
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <ContactLocationForm
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 3:
        return (
          <BusinessVerificationForm
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 4:
        return (
          <PaymentSetupForm
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      case 5:
        return (
          <FinalReviewForm
            formData={formData}
            updateFormData={updateFormData}
            onPrevious={handlePrevious}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <button className="btn btn-primary mt-4 mx-4" onClick={() => navigate('/')}>
        <ArrowLeft className="me-2" /> Back
      </button>
      <div className="container">
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="form-title">UdhyogUnity Business Registration</h1>
          <p className="form-subtitle">Complete the form to register your business and join our platform</p>

          <Stepper currentStep={currentStep} totalSteps={5} />

          {renderStep()}
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterBusiness;