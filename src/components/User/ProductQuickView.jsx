import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Tag, CheckCircle, XCircle, Calendar, Clock, Package, Store, Award, ExternalLink, Star, ShoppingBag, CreditCard, IndianRupee, AlertCircle, CreditCard as PaymentIcon, MapPin, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../Firebase/ordersDb';
import { createRazorpayOrder } from '../../Firebase/razorpayUtil';
import { getUserFromFirestore } from '../../Firebase/db';
import './ProductQuickView.css';

const ProductQuickView = ({ product, onClose, onBuy }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Order states
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [orderStep, setOrderStep] = useState('initial'); // initial, checkout, success
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: payment, 2: pickup, 3: summary
  const [paymentMethod, setPaymentMethod] = useState('online'); // online, cash
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [notes, setNotes] = useState('');
  const [userData, setUserData] = useState(null);

  const { currentUser } = useAuth();

  // Format price with Indian Rupee symbol
  const formatPrice = (price) => `₹${parseFloat(price).toLocaleString('en-IN')}`;

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleDateString('en-IN', options);
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Calculate discount percentage if discounted price exists
  const calculateDiscount = () => {
    if (product.discountedPrice && product.price) {
      const discount = ((product.price - product.discountedPrice) / product.price) * 100;
      return Math.round(discount);
    }
    return null;
  };
  const discountPercentage = calculateDiscount();

  // Get actual price (discounted if available)
  const getActualPrice = () => {
    return product.discountedPrice || product.price || 0;
  };

  // Get total amount
  const getTotalAmount = () => {
    return getActualPrice() * quantity;
  };

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          const user = await getUserFromFirestore(currentUser.email);
          setUserData(user);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    loadUserData();
  }, [currentUser]);

  // Handle buy button click
  const handleBuy = () => {
    if (!currentUser) {
      setBuyError('Please login to purchase products');
      return;
    }

    if (!product.inStock) {
      setBuyError('This product is currently out of stock');
      return;
    }

    // Proceed to checkout steps
    setOrderStep('checkout');
    setCheckoutStep(1); // Start with payment method selection
    setBuyError('');
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    // Move to pickup details step
    setCheckoutStep(2);
  };

  // Handle pickup details submission
  const handlePickupDetailsSubmit = () => {
    if (!pickupDate) {
      setBuyError('Please select a pickup date');
      return;
    }

    if (!pickupTime) {
      setBuyError('Please select a pickup time');
      return;
    }

    // Move to order summary step
    setCheckoutStep(3);
    setBuyError('');
  };

  // Handle final order confirmation
  const handleConfirmOrder = () => {
    // Process the order based on payment method
    if (paymentMethod === 'online') {
      processOnlinePayment();
    } else {
      processCashOnPickup();
    }
  };

  // Process payment via Razorpay
  const processOnlinePayment = () => {
    setBuying(true);
    setBuyError('');

    const totalAmount = getTotalAmount();
    console.log(`Processing payment for ${product.name} x ${quantity}, amount: ₹${totalAmount}`);

    // Check for test mode on localhost
    const isTestMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Create Razorpay order
    createRazorpayOrder({
      amount: Math.round(totalAmount * 100), // in paisa, ensure it's an integer
      currency: 'INR',
      name: product.businessName || 'UdhyogUnity Business',
      description: `Purchase of ${product.name} x ${quantity}`,
      customerInfo: {
        name: userData ? `${userData.firstName} ${userData.lastName}` : 'Customer',
        email: currentUser?.email || '',
        phone: userData?.phone || ''
      },
      onSuccess: (response) => {
        console.log('Payment successful:', response);
        // Create order in Firebase
        createOrderInFirebase({
          paymentMethod: 'online',
          paymentStatus: 'Paid',
          orderStatus: 'Confirmed',
          paymentDetails: {
            provider: 'razorpay',
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature
          }
        });
      },
      onError: (error) => {
        console.error('Payment error:', error);
        setBuying(false);
        setBuyError(`Payment failed: ${error.message || 'Unknown error occurred'}`);

        // In test mode, allow cash on pickup as fallback
        if (isTestMode) {
          setTimeout(() => {
            setBuyError('Online payment failed. You can choose cash on pickup instead.');
          }, 2000);
        }
      }
    });
  };

  // Process cash on pickup
  const processCashOnPickup = () => {
    setBuying(true);
    setBuyError('');

    // Create order in Firebase
    createOrderInFirebase({
      paymentMethod: 'cash',
      paymentStatus: 'Pending',
      orderStatus: 'Confirmed'
    });
  };

  // Create order in Firebase
  const createOrderInFirebase = async (paymentInfo) => {
    try {
      if (!currentUser || !userData) {
        throw new Error('User not authenticated');
      }

      console.log("Creating order with user:", currentUser.email);

      const orderData = {
        productId: product.id,
        productName: product.name,
        productImage: product.images && product.images.length > 0 ?
          (product.images[0].url || product.images[0]) : '',
        productPrice: getActualPrice(),
        quantity,
        totalAmount: getTotalAmount(),
        businessId: product.businessId || product.businessEmail,
        businessEmail: product.businessEmail,
        businessName: product.businessName,
        customerId: currentUser.uid || currentUser.email,
        customerEmail: currentUser.email, // This is the field used for querying orders
        customerName: userData ? `${userData.firstName} ${userData.lastName}` : '',
        customerPhone: userData?.phone || '',
        pickupDateTime: new Date(pickupDate + ' ' + pickupTime.split(' - ')[0]),
        notes,
        status: paymentInfo.orderStatus,
        paymentMethod: paymentInfo.paymentMethod,
        paymentStatus: paymentInfo.paymentStatus,
        paymentDetails: paymentInfo.paymentDetails || null
      };

      console.log("Submitting order data:", orderData);

      // Create order in Firestore
      const order = await createOrder(orderData);
      console.log("Order created successfully:", order.id);

      // Order created successfully
      setOrderStep('success');
      setBuying(false);

      // Callback if provided
      if (onBuy) {
        onBuy({
          orderId: order.id,
          ...orderData
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setBuyError(`Failed to create order: ${error.message}`);
      setBuying(false);
    }
  };

  return (
    <div className="quickview-modal-overlay" onClick={onClose}>
      <motion.div
        className="quickview-modal"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="quickview-header">
          <button className="close-btn" onClick={onClose}><X size={22} /></button>
        </div>
        <div className="quickview-content">
          <div className="quickview-gallery">
            {product.images && product.images.length > 0 ? (
              <motion.img
                key={selectedImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={product.images[selectedImageIndex]?.url || product.images[selectedImageIndex]}
                alt={product.name}
                className="main-product-image"
                onClick={() => setFullscreenImage(product.images[selectedImageIndex]?.url || product.images[selectedImageIndex])}
              />
            ) : (
              <div className="no-image-placeholder">
                <Package size={64} />
                <span>No Image Available</span>
              </div>
            )}
            {discountPercentage && (
              <motion.div
                className="discount-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              >
                -{discountPercentage}%
              </motion.div>
            )}
            {product.images && product.images.length > 1 && (
              <motion.div
                className="product-thumbnails"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {product.images.map((image, index) => (
                  <motion.div
                    key={image.id || index}
                    className={`thumbnail-container ${index === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={image.url || image}
                      alt={`${product.name} - ${index + 1}`}
                      className="product-thumbnail"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
          <motion.div
            className="quickview-details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.h2
              className="product-title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {product.name}
            </motion.h2>
            <div className="product-category-tag">
              <Tag size={16} className="me-1" />
              <span>{product.category}</span>
            </div>
            <div className="product-rating">
              <div className="rating-badge">
                <span>{product.rating || 0}</span>
                <Star size={12} fill="#ffffff" />
              </div>
              <span className="rating-count">({product.reviewCount || 0} Reviews)</span>
            </div>
            {product.isActive && (
              <div className="assured-badge">
                <Award size={16} className="me-1" />
                <span>UdhyogUnity Assured</span>
              </div>
            )}
            <div className="product-pricing-section">
              {product.discountedPrice ? (
                <div className="pricing-row">
                  <div className="discounted-price-view">{formatPrice(product.discountedPrice)}</div>
                  <div className="original-price-view">{formatPrice(product.price)}</div>
                  {discountPercentage && (
                    <div className="discount-percentage">{discountPercentage}% off</div>
                  )}
                </div>
              ) : (
                <div className="regular-price-view">{formatPrice(product.price)}</div>
              )}
              <div className="tax-info">Inclusive of all taxes</div>
            </div>
            <div className="product-highlights">
              <div className="highlight-row">
                <div className="highlight-label">Availability</div>
                <div className="highlight-value">
                  <div className={`status-indicator ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
                    {product.inStock ? (
                      <>
                        <CheckCircle size={16} className="me-1" />
                        <span>In Stock ({product.quantity} available)</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="me-1" />
                        <span>Out of Stock</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="highlight-row">
                <div className="highlight-label">Delivery</div>
                <div className="highlight-value">
                  <div className="delivery-options">
                    {product.availableForPickup && (
                      <div className="delivery-option available">
                        <Store size={16} className="me-1" />
                        <span>Store Pickup Available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="product-description">
              <h3 className="highlight-label">Description</h3>
              <p className="description-text">{product.description}</p>
            </div>

            {/* Initial step - Quantity selection and Buy button */}
            {orderStep === 'initial' && (
              <>
                <div className="quickview-buy-row">
                  <div className="quantity-control">
                    <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>-</button>
                    <span className="qty-value">{quantity}</span>
                    <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                  <button
                    className={`btn btn-primary buy-btn ${buying ? 'loading' : ''}`}
                    onClick={handleBuy}
                    disabled={buying || !product.inStock}
                  >
                    {buying ? (
                      <>
                        <div className="loading-spinner"></div>
                        <span className="btn-text">Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        <span>Buy Now</span>
                      </>
                    )}
                  </button>
                </div>
                {buyError && (
                  <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AlertCircle size={20} />
                    {buyError}
                  </motion.div>
                )}
              </>
            )}

            {/* Checkout steps */}
            {orderStep === 'checkout' && (
              <div className="order-step-container">
                {/* Stepper UI */}
                <div className="stepper">
                  <div className={`step ${checkoutStep >= 1 ? 'active' : ''} ${checkoutStep > 1 ? 'completed' : ''}`}>
                    <div className="step-circle">
                      {checkoutStep > 1 ? <CheckCircle size={16} /> : 1}
                    </div>
                    <div className="step-label">Payment</div>
                  </div>
                  <div className={`step ${checkoutStep >= 2 ? 'active' : ''} ${checkoutStep > 2 ? 'completed' : ''}`}>
                    <div className="step-circle">
                      {checkoutStep > 2 ? <CheckCircle size={16} /> : 2}
                    </div>
                    <div className="step-label">Pickup Details</div>
                  </div>
                  <div className={`step ${checkoutStep >= 3 ? 'active' : ''}`}>
                    <div className="step-circle">
                      {checkoutStep > 3 ? <CheckCircle size={16} /> : 3}
                    </div>
                    <div className="step-label">Review Order</div>
                  </div>
                </div>

                {/* Step 1: Payment Method Selection */}
                <div className={`step-content ${checkoutStep === 1 ? 'active' : ''}`}>
                  <h3><PaymentIcon size={20} className="me-2" /> Select Payment Method</h3>
                  <div className="payment-options">
                    <div
                      className={`payment-option ${paymentMethod === 'online' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('online')}
                    >
                      <CreditCard size={24} />
                      <span>Pay Online</span>
                      <p className="payment-description">Secure payment via Razorpay</p>
                    </div>
                    <div
                      className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <IndianRupee size={24} />
                      <span>Pay at Pickup</span>
                      <p className="payment-description">Cash or UPI payment when you collect your items</p>
                    </div>
                  </div>
                  <div className="step-actions">
                    <button className="back-btn" onClick={() => setOrderStep('initial')}>
                      Back
                    </button>
                    <button className="next-btn" onClick={() => handlePaymentMethodSelect(paymentMethod)}>
                      Continue
                    </button>
                  </div>
                </div>

                {/* Step 2: Pickup Details */}
                <div className={`step-content ${checkoutStep === 2 ? 'active' : ''}`}>
                  <h3><MapPin size={20} className="me-2" /> Pickup Details</h3>
                  <div className="pickup-form">
                    <div className="form-group">
                      <label>Pickup Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Pickup Time *</label>
                      <select
                        className="form-control"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        required
                      >
                        <option value="">Select a time</option>
                        <option value="9:00 AM - 10:00 AM">9:00 AM - 10:00 AM</option>
                        <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                        <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                        <option value="12:00 PM - 1:00 PM">12:00 PM - 1:00 PM</option>
                        <option value="1:00 PM - 2:00 PM">1:00 PM - 2:00 PM</option>
                        <option value="2:00 PM - 3:00 PM">2:00 PM - 3:00 PM</option>
                        <option value="3:00 PM - 4:00 PM">3:00 PM - 4:00 PM</option>
                        <option value="4:00 PM - 5:00 PM">4:00 PM - 5:00 PM</option>
                        <option value="5:00 PM - 6:00 PM">5:00 PM - 6:00 PM</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Any special instructions for your order..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div className="step-actions">
                    <button className="back-btn" onClick={() => setCheckoutStep(1)}>
                      Back
                    </button>
                    <button className="next-btn" onClick={handlePickupDetailsSubmit}>
                      Continue
                    </button>
                  </div>
                </div>

                {/* Step 3: Order Summary & Confirmation */}
                <div className={`step-content ${checkoutStep === 3 ? 'active' : ''}`}>
                  <h3><ClipboardList size={20} className="me-2" /> Review & Confirm Order</h3>
                  <div className="order-summary">
                    <div className="summary-card">
                      <h4>Product Details</h4>
                      <table className="summary-table">
                        <tbody>
                          <tr className="summary-row">
                            <td>Product</td>
                            <td>{product.name}</td>
                          </tr>
                          <tr className="summary-row">
                            <td>Quantity</td>
                            <td>{quantity}</td>
                          </tr>
                          <tr className="summary-row total">
                            <td>Total Amount</td>
                            <td>{formatPrice(getTotalAmount())}</td>
                          </tr>
                          <tr className="summary-row">
                            <p></p>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="summary-card">
                      <h4>Pickup Details</h4>
                      <table className="summary-table">
                        <tbody>
                          <tr className="summary-row">
                            <td>Pickup Date</td>
                            <td>{formatDate(pickupDate)}</td>
                          </tr>
                          <tr className="summary-row">
                            <td>Pickup Time</td>
                            <td>{pickupTime}</td>
                          </tr>
                          <tr className="summary-row">
                            <td>Payment</td>
                            <td>{paymentMethod === 'online' ? 'Pay Online (Razorpay)' : 'Cash on Pickup'}</td>
                          </tr>
                          {notes && (
                            <tr className="summary-row">
                              <td>Notes</td>
                              <td>{notes}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="step-actions">
                    <button className="back-btn" onClick={() => setCheckoutStep(2)}>
                      Back
                    </button>
                    <button
                      className={`confirm-btn ${buying ? 'loading' : ''}`}
                      onClick={handleConfirmOrder}
                      disabled={buying}
                    >
                      {buying ? (
                        <>
                          <div className="loading-spinner"></div>
                          <span className="btn-text">Processing...</span>
                        </>
                      ) : (
                        'Confirm Order'
                      )}
                    </button>
                  </div>
                </div>

                {buyError && (
                  <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AlertCircle size={20} />
                    {buyError}
                  </motion.div>
                )}
              </div>
            )}

            {/* Success step */}
            {orderStep === 'success' && (
              <motion.div
                className="order-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="success-icon">
                  <CheckCircle size={64} />
                </div>
                <h3>Order Placed Successfully!</h3>
                <div className="success-detail">
                  <p>{product.name} × {quantity} • {formatPrice(getTotalAmount())}</p>
                </div>
                <p>Thank you for your purchase. You can pick up your order at the store during your selected time slot.</p>
                <div className="success-actions">
                  <button className="btn btn-outline" onClick={onClose}>
                    <ArrowLeft size={18} />
                    <span>Continue Shopping</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    onClose();
                    // Use sessionStorage to remember we want to go to the orders tab
                    sessionStorage.setItem('redirectToTab', 'orders');
                    window.location.href = '/dashboard';
                  }}>
                    <ClipboardList size={18} />
                    <span>View My Orders</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

        </div>
        {
          fullscreenImage && (
            <motion.div
              className="fullscreen-image-modal"
              onClick={() => setFullscreenImage(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="fullscreen-image-content"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <button className="fullscreen-close-btn" onClick={() => setFullscreenImage(null)}>
                  <X size={24} />
                </button>
                <img src={fullscreenImage} alt="Full size" />
                <a
                  href={fullscreenImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="open-in-new-tab-btn"
                >
                  <ExternalLink size={20} />
                  <span>Open in New Tab</span>
                </a>
              </motion.div>
            </motion.div>
          )
        }
      </motion.div >
    </div >
  );
};

export default ProductQuickView;
