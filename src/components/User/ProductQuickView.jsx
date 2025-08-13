import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Tag, CheckCircle, XCircle, Calendar, Clock, Package, Store, Award, ExternalLink, Star, ShoppingBag, CreditCard, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../Firebase/ordersDb';
import { createRazorpayOrder } from '../../Firebase/razorpayUtil';
import { getUserFromFirestore } from '../../Firebase/db';
import './ProductQuickView.css';

// product: product object
// onClose: close modal
// onBuy: optional callback after successful buy
const ProductQuickView = ({ product, onClose, onBuy }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Order states
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [orderStep, setOrderStep] = useState('initial'); // initial, payment, pickup, success
  const [paymentMethod, setPaymentMethod] = useState('online'); // online, pickup
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
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString.toDate?.() || dateString;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
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

    // Proceed to payment selection
    setOrderStep('payment');
    setBuyError('');
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setOrderStep('pickup');
  };

  // Handle pickup date/time submission
  const handlePickupSubmit = () => {
    if (!pickupDate) {
      setBuyError('Please select a pickup date');
      return;
    }

    if (!pickupTime) {
      setBuyError('Please select a pickup time');
      return;
    }

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
            <div className="main-image-container">
              {product.images && product.images.length > 0 ? (
                <img
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
                <div className="discount-badge">-{discountPercentage}%</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="product-thumbnails">
                {product.images.map((image, index) => (
                  <div
                    key={image.id || index}
                    className={`thumbnail-container ${index === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={image.url || image}
                      alt={`${product.name} - ${index + 1}`}
                      className="product-thumbnail"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="quickview-details">
            <h2 className="product-title">{product.name}</h2>
            <div className="product-category-tag">
              <Tag size={16} className="me-1" />
              <span>{product.category}</span>
            </div>
            <div className="product-rating">
              <div className="rating-badge">
                <span>{product.rating || 4.5}</span>
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
              <h3>Description</h3>
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
                    className="btn btn-primary buy-btn"
                    onClick={handleBuy}
                    disabled={buying || !product.inStock}
                  >
                    <ShoppingBag size={18} />
                    <span>{buying ? 'Processing...' : 'Buy Now'}</span>
                  </button>
                </div>
                {buyError && <div className="error-message">{buyError}</div>}
              </>
            )}

            {/* Payment method selection step */}
            {orderStep === 'payment' && (
              <div className="order-step-container">
                <h3>Select Payment Method</h3>
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
                    <DollarSign size={24} />
                    <span>Pay at Pickup</span>
                    <p className="payment-description">Cash or UPI payment when you collect your items</p>
                  </div>
                </div>
                <div className="step-actions">
                  <button className="btn btn-outline back-btn" onClick={() => setOrderStep('initial')}>
                    Back
                  </button>
                  <button className="btn btn-primary next-btn" onClick={() => handlePaymentMethodSelect(paymentMethod)}>
                    Continue
                  </button>
                </div>
                {buyError && <div className="error-message">{buyError}</div>}
              </div>
            )}

            {/* Pickup details step */}
            {orderStep === 'pickup' && (
              <div className="order-step-container">
                <h3>Pickup Details</h3>
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
                <div className="order-summary">
                  <h4>Order Summary</h4>
                  <div className="summary-row">
                    <span>Product:</span>
                    <span>{product.name}</span>
                  </div>
                  <div className="summary-row">
                    <span>Quantity:</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="summary-row">
                    <span>Price per unit:</span>
                    <span>{formatPrice(getActualPrice())}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount:</span>
                    <span>{formatPrice(getTotalAmount())}</span>
                  </div>
                  <div className="summary-row">
                    <span>Payment Method:</span>
                    <span>{paymentMethod === 'online' ? 'Pay Online' : 'Pay at Pickup'}</span>
                  </div>
                </div>
                <div className="step-actions">
                  <button className="btn btn-outline back-btn" onClick={() => setOrderStep('payment')}>
                    Back
                  </button>
                  <button
                    className="btn btn-primary confirm-btn"
                    onClick={handlePickupSubmit}
                    disabled={buying}
                  >
                    {buying ? 'Processing...' : 'Confirm Order'}
                  </button>
                </div>
                {buyError && <div className="error-message">{buyError}</div>}
              </div>
            )}

            {/* Success step */}
            {orderStep === 'success' && (
              <div className="order-success">
                <div className="success-icon">
                  <CheckCircle size={64} color="#4CAF50" />
                </div>
                <h3>Order Placed Successfully!</h3>
                <p>Thank you for your order. You can view your order details in the Orders section of your account.</p>
                <div className="success-actions">
                  <button className="btn btn-outline" onClick={onClose}>
                    Close
                  </button>
                  <button className="btn btn-primary" onClick={() => {
                    onClose();
                    // Use sessionStorage to remember we want to go to the orders tab
                    sessionStorage.setItem('redirectToTab', 'orders');
                    window.location.href = '/dashboard';
                  }}>
                    View My Orders
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {fullscreenImage && (
          <div className="fullscreen-image-modal" onClick={() => setFullscreenImage(null)}>
            <div className="fullscreen-image-content" onClick={e => e.stopPropagation()}>
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
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProductQuickView;
