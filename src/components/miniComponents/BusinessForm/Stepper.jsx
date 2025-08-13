import React from 'react';
import { motion } from 'framer-motion';

const Stepper = ({ currentStep, totalSteps }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const progressWidth = `${((currentStep - 1) / (totalSteps - 1)) * 100}%`;
  
  const stepLabels = [
    'Business Details',
    'Contact & Location',
    'Verification',
    'Payment Setup',
    'Review & Submit'
  ];
  
  return (
    <div className="stepper-container">
      <motion.div 
        className="stepper-progress"
        initial={{ width: '0%' }}
        animate={{ width: progressWidth }}
        transition={{ duration: 0.5 }}
      />
      
      {steps.map((step) => (
        <div key={step} className="step-wrapper">
          <motion.div 
            className={`step-item ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
            initial={{ scale: 1 }}
            animate={{ 
              scale: step === currentStep ? 1.2 : 1,
              backgroundColor: step === currentStep 
                ? '#4361ee' 
                : step < currentStep 
                  ? '#4cc9f0' 
                  : '#ffffff'
            }}
            transition={{ duration: 0.3 }}
          >
            {step < currentStep ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              step
            )}
          </motion.div>
          <span className="step-label">{stepLabels[step - 1]}</span>
        </div>
      ))}
    </div>
  );
};

export default Stepper;