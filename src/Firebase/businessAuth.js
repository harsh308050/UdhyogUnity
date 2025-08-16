import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    signOut
} from "firebase/auth";
import { app } from "./config";
import { addBusinessUserToFirestore, getBusinessUserFromFirestore } from "./businessDb";

const auth = getAuth(app);

// Business sign in with email and password
export const businessSignIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verify this is a business user
        const businessData = await getBusinessUserFromFirestore(user.email);
        if (!businessData) {
            throw new Error("No business account found with this email. Please register your business first.");
        }

        return user;
    } catch (error) {
        console.error("Business sign-in error:", error);
        throw error;
    }
};

// Business sign up with email and password
export const businessSignUp = async (email, password, businessData = {}) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Ensure phone number has +91 prefix
        let formattedPhone = businessData.phone || '';
        if (formattedPhone && !formattedPhone.startsWith('+91')) {
            // Remove any existing country code and ensure it starts with +91
            formattedPhone = formattedPhone.replace(/^\+?91?/, '');
            formattedPhone = '+91' + formattedPhone;
        }

        // Save business user data to Firestore
        await addBusinessUserToFirestore(user, {
            email: user.email,
            businessName: businessData.businessName || '',
            contactPerson: businessData.contactPerson || '',
            phone: formattedPhone,
            businessType: businessData.businessType || '',
            accountType: 'business',
            isVerified: false,
            createdAt: new Date().toISOString()
        });

        return user;
    } catch (error) {
        console.error("Business sign-up error:", error);
        throw error;
    }
};

// Initialize reCAPTCHA for phone authentication
export const initializeRecaptcha = (containerId = 'recaptcha-container') => {
    try {
        // Check if we already have a valid reCAPTCHA verifier
        if (window.recaptchaVerifier) {
            // If already exists, don't render again, just return it
            console.log("Using existing reCAPTCHA verifier");
            return window.recaptchaVerifier;
        }

        // Check if container exists
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`reCAPTCHA container with ID '${containerId}' not found`);
            throw new Error(`reCAPTCHA container with ID '${containerId}' not found`);
        }

        // Clear container contents
        container.innerHTML = '';

        // Create a new reCAPTCHA instance
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible',
            'callback': (response) => {
                console.log("reCAPTCHA solved");
            },
            'expired-callback': () => {
                console.log("reCAPTCHA expired");
            }
        });

        console.log("New reCAPTCHA verifier created");
        return window.recaptchaVerifier;
    } catch (error) {
        console.error("Error initializing reCAPTCHA:", error);
        throw error;
    }
};

// Send OTP to phone number
export const sendOTPToPhone = async (phoneNumber) => {
    try {
        console.log("Attempting to send OTP to:", phoneNumber);

        // Get or initialize reCAPTCHA
        let appVerifier;
        try {
            // Try to get existing verifier first
            if (window.recaptchaVerifier) {
                appVerifier = window.recaptchaVerifier;
                console.log("Using existing reCAPTCHA verifier");
            } else {
                // Initialize a new one
                appVerifier = initializeRecaptcha();
                console.log("Created new reCAPTCHA verifier");
            }
        } catch (recaptchaError) {
            console.error("Error with reCAPTCHA:", recaptchaError);

            // If there was an error, clear any existing reCAPTCHA
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                } catch (clearError) {
                    console.error("Error clearing reCAPTCHA:", clearError);
                }
            }

            // Try once more with a completely new instance
            const recaptchaContainer = document.getElementById('recaptcha-container');
            if (recaptchaContainer) {
                recaptchaContainer.innerHTML = '';
                console.log("Cleared reCAPTCHA container for fresh start");
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            appVerifier = initializeRecaptcha();
        }

        // Try to send OTP
        console.log("Sending OTP using reCAPTCHA verifier...");
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        console.log("OTP sent successfully to:", phoneNumber);

        return confirmationResult;
    } catch (error) {
        console.error("Error sending OTP:", error);

        // If error is about reCAPTCHA, give clear instructions
        if (error.message && error.message.includes('reCAPTCHA')) {
            console.log("Clearing problematic reCAPTCHA instance");
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (clearError) {
                    console.error("Error clearing reCAPTCHA after failure:", clearError);
                }
                window.recaptchaVerifier = null;
            }
            throw new Error("Could not verify phone number. Please refresh the page and try again.");
        }

        throw error;
    }
};

// Verify OTP and sign in
export const verifyOTPAndSignIn = async (confirmationResult, otp) => {
    try {
        const result = await confirmationResult.confirm(otp);
        const user = result.user;

        // Check if this is a business user by phone number
        const businessData = await getBusinessUserFromFirestore(null, user.phoneNumber);
        if (!businessData) {
            throw new Error("No business account found with this phone number. Please register your business first.");
        }

        // Get the business email from business data to link with authentication
        if (businessData.email) {
            // Store business data in session storage for immediate access
            sessionStorage.setItem('businessData', JSON.stringify(businessData));

            // Store the authentication email to help with auth state syncing
            sessionStorage.setItem('businessAuthEmail', businessData.email);
        }

        return user;
    } catch (error) {
        console.error("Error verifying OTP:", error);
        throw error;
    }
};

// Business logout
export const businessLogOut = async () => {
    try {
        await signOut(auth);
        // Clear reCAPTCHA
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
        return true;
    } catch (error) {
        console.error("Business logout error:", error);
        throw error;
    }
};

// Validate email and phone combination for business login
export const validateBusinessEmailPhone = async (email, phone) => {
    try {
        console.log("Validating business credentials:", { email, phone: phone.slice(-4) });

        // First check BusinessUsers collection for authentication
        const businessUserData = await getBusinessUserFromFirestore(email);
        if (!businessUserData) {
            console.error("No business account found with email:", email);
            throw new Error("No business account found with this email");
        }

        console.log("Found business user data:", businessUserData.email);

        // Format phone number for comparison
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone;
        }

        // Normalize phone numbers for comparison by removing spaces and non-digits
        const normalizePhone = (phone) => {
            return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        };

        const normalizedInputPhone = normalizePhone(formattedPhone);
        const normalizedStoredPhone = normalizePhone(businessUserData.phone || '');

        console.log("Phone comparison:", {
            normalizedInput: normalizedInputPhone.slice(-4),
            normalizedStored: normalizedStoredPhone.slice(-4)
        });

        if (normalizedInputPhone !== normalizedStoredPhone) {
            console.error("Phone numbers don't match:", {
                input: normalizedInputPhone.slice(-4),
                stored: normalizedStoredPhone.slice(-4)
            });
            throw new Error("Mobile number does not match the email account");
        }

        console.log("Phone number matched, fetching full business data");

        // Now fetch the complete business data from Businesses collection
        const { getBusinessDataFromFirestore } = await import('./getBusinessData');
        const fullBusinessData = await getBusinessDataFromFirestore(email);

        if (fullBusinessData) {
            console.log("Found full business data for:", email);

            // Save the email in localStorage for persistence
            localStorage.setItem('businessEmail', email);

            // Return the complete business data from Businesses collection
            return fullBusinessData;
        } else {
            console.log("No full business data found, using basic data");

            // Save the email in localStorage for persistence
            localStorage.setItem('businessEmail', email);

            // Fallback to BusinessUsers data if no data in Businesses collection
            return businessUserData;
        }
    } catch (error) {
        console.error("Email-phone validation error:", error);
        throw error;
    }
};

export { auth };
