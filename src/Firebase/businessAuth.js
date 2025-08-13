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
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                'size': 'invisible',
                'callback': (response) => {
                    console.log("reCAPTCHA solved");
                },
                'expired-callback': () => {
                    console.log("reCAPTCHA expired");
                    window.recaptchaVerifier = null;
                }
            });
        }
        return window.recaptchaVerifier;
    } catch (error) {
        console.error("Error initializing reCAPTCHA:", error);
        throw error;
    }
};

// Send OTP to phone number
export const sendOTPToPhone = async (phoneNumber) => {
    try {
        const appVerifier = initializeRecaptcha();
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        return confirmationResult;
    } catch (error) {
        console.error("Error sending OTP:", error);
        // Reset reCAPTCHA on error
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
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
        // First check BusinessUsers collection for authentication
        const businessUserData = await getBusinessUserFromFirestore(email);
        if (!businessUserData) {
            throw new Error("No business account found with this email");
        }

        // Format phone number for comparison
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone;
        }

        if (businessUserData.phone !== formattedPhone) {
            throw new Error("Mobile number does not match the email account");
        }

        // Now fetch the complete business data from Businesses collection
        const { getBusinessDataFromFirestore } = await import('./getBusinessData');
        const fullBusinessData = await getBusinessDataFromFirestore(email);

        if (fullBusinessData) {
            // Return the complete business data from Businesses collection
            return fullBusinessData;
        } else {
            // Fallback to BusinessUsers data if no data in Businesses collection
            return businessUserData;
        }
    } catch (error) {
        console.error("Email-phone validation error:", error);
        throw error;
    }
};

export { auth };
