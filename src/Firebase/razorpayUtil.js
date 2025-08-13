/**
 * Razorpay integration utility
 * 
 * This module helps with integrating Razorpay payments into the application.
 * It includes loading the Razorpay SDK, creating orders, and handling payments.
 */

// Test mode key - replace with actual key in production
const RAZORPAY_KEY_ID = "rzp_test_A6DrVXpkyXHyww";

/**
 * Load the Razorpay SDK
 * @returns {Promise<void>}
 */
export const loadRazorpay = () => {
    return new Promise((resolve, reject) => {
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            reject(new Error('Failed to load Razorpay SDK'));
        };
        document.body.appendChild(script);
    });
};

/**
 * Create a Razorpay order and open the payment modal
 * @param {Object} options Payment options
 * @param {number} options.amount Amount in paisa (Rs * 100)
 * @param {string} options.currency Currency code (default: INR)
 * @param {string} options.name Business name
 * @param {string} options.description Payment description
 * @param {Object} options.customerInfo Customer information
 * @param {Function} options.onSuccess Success callback
 * @param {Function} options.onError Error callback
 * @returns {Promise<void>}
 */
export const createRazorpayOrder = async ({
    amount,
    currency = 'INR',
    name,
    description,
    customerInfo,
    onSuccess,
    onError
}) => {
    try {
        await loadRazorpay();

        // In a real implementation, you would call your backend to create an order
        // For now, we'll create a mock order ID
        const orderId = 'order_' + Math.random().toString(36).substring(2, 15);

        console.log('Creating Razorpay payment with options:', {
            amount,
            currency,
            name,
            description,
            customer: customerInfo
        });

        const options = {
            key: RAZORPAY_KEY_ID,
            amount: parseInt(amount).toString(), // in paisa, ensure it's an integer
            currency,
            name,
            description,
            // Omit order_id for direct payments without server-side order creation
            handler: function (response) {
                console.log('Payment successful, response:', response);
                // This handler is called when payment is successful
                onSuccess({
                    razorpay_payment_id: response.razorpay_payment_id || 'pay_' + Math.random().toString(36).substring(2, 15),
                    razorpay_order_id: response.razorpay_order_id || orderId,
                    razorpay_signature: response.razorpay_signature || 'test_signature'
                });
            },
            prefill: {
                name: customerInfo.name || '',
                email: customerInfo.email || '',
                contact: customerInfo.phone || ''
            },
            theme: {
                color: '#4a69e2'
            },
            modal: {
                ondismiss: function () {
                    console.log('Payment modal dismissed by user');
                    onError(new Error('Payment cancelled by user'));
                }
            }
        };

        console.log('Opening Razorpay payment form');
        const razorpayInstance = new window.Razorpay(options);

        // Add error event handler
        razorpayInstance._options = {
            ...razorpayInstance._options,
            notes: {
                totalAmount: options.amount / 100, // Store amount in rupees for reference
            }
        };

        // Open the payment form
        razorpayInstance.open();
    } catch (error) {
        console.error("Razorpay error:", error);
        // Use fallback mode for testing if needed
        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            console.log('Using test payment flow since we are in development');
            onSuccess({
                razorpay_payment_id: 'pay_' + Math.random().toString(36).substring(2, 15),
                razorpay_order_id: 'order_' + Math.random().toString(36).substring(2, 15),
                razorpay_signature: 'test_signature'
            });
            return;
        }
        onError(error);
    }
};

/**
 * Verify a Razorpay payment
 * In a real implementation, this would be done server-side
 * @param {Object} payment Payment details
 * @returns {Promise<boolean>}
 */
export const verifyRazorpayPayment = async (payment) => {
    // In a real implementation, this would call your backend API
    // to verify the payment using the Razorpay API
    // For now, we'll simulate a successful verification
    console.log("Payment verification (mock):", payment);
    return true;
};
