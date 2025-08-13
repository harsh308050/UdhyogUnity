// src/utils/razorpay.js
// Lightweight loader for Razorpay checkout script and payment initiation

export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

// options should include: key, amount (in paise), currency, name, description, order_id?, prefill, notes, theme, handler
export const openRazorpayCheckout = async (options) => {
  await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    try {
      const rzp = new window.Razorpay({
        ...options,
        handler: (response) => resolve({ success: true, response }),
        modal: {
          ondismiss: () => resolve({ success: false, dismissed: true }),
        },
      });
      rzp.on('payment.failed', (resp) => resolve({ success: false, error: resp.error }));
      rzp.open();
    } catch (e) {
      reject(e);
    }
  });
};

export default { loadRazorpayScript, openRazorpayCheckout };
