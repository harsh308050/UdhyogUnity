import React, { useState } from 'react';
import { loadRazorpay } from '../../Firebase/razorpayUtil';

// This component is used only for testing Razorpay integration
const RazorpayTest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState('');

  const RAZORPAY_KEY_ID = "rzp_test_A6DrVXpkyXHyww";

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Load Razorpay SDK
      await loadRazorpay();

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load');
      }

      // Create a test order
      const amount = 100 * 100; // ₹100 in paisa
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amount.toString(),
        currency: 'INR',
        name: 'UdhyogUnity Test',
        description: 'Test payment',
        handler: function (response) {
          console.log('Payment success', response);
          setSuccess(true);
          setPaymentId(response.razorpay_payment_id);
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#4a69e2'
        },
        modal: {
          confirm_close: true,
          escape: false,
          ondismiss: function () {
            setError('Payment cancelled by user');
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);

      // Add debugging event handlers
      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      console.error('Error in payment:', err);
      setError(err.message || 'An unknown error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Razorpay Test Payment</h2>
      <p>This is a test component to verify Razorpay integration is working correctly.</p>
      <p>Amount: ₹100.00</p>

      <button
        onClick={handlePayment}
        disabled={loading}
        style={{
          padding: '10px 15px',
          backgroundColor: '#4a69e2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Processing...' : 'Test Payment'}
      </button>

      {error && (
        <div style={{ marginTop: '15px', color: 'red', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '15px', color: 'green', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
          Payment successful! Payment ID: {paymentId}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Debug Info</h3>
        <p>Razorpay SDK loaded: {window.Razorpay ? 'Yes' : 'No'}</p>
        <p>Test mode: {window.location.hostname === 'localhost' ? 'Yes' : 'No'}</p>
        <p>Current environment: {process.env.NODE_ENV || 'unknown'}</p>
      </div>
    </div>
  );
};

export default RazorpayTest;
