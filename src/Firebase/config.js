import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyASP_X69z1QCR-2yHNQiGz2jSyJfEkeVWs",
    authDomain: "udhyogunity.firebaseapp.com",
    projectId: "udhyogunity",
    storageBucket: "udhyogunity.appspot.com",
    messagingSenderId: "386783371740",
    appId: "1:386783371740:web:7ad8e594379f086d58af19",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Export the Firebase app and services
export { app, db, storage };
export default app;