import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

// storage is now imported directly from config.js, so we don't need to reinitialize it

export const uploadProfilePhoto = async (file, userId) => {
    if (!file || !userId) return null;

    const fileRef = ref(storage, `profilePhotos/${userId}_${new Date().getTime()}`);

    try {
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

export { storage };