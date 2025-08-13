// src/Firebase/cloudinary.js
// Utility to upload files to Cloudinary and return the URL

const CLOUDINARY_UPLOAD_PRESET = 'UdhyogUnity'; // Replace with your Cloudinary upload preset
const CLOUDINARY_CLOUD_NAME = 'debf09qz0'; // Replace with your Cloudinary cloud name
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`; // Changed to /upload instead of /auto/upload

// Helper to format folder paths correctly for Cloudinary
// Cloudinary doesn't want leading or trailing slashes in folder names
export const formatCloudinaryFolder = (folder) => {
    if (!folder) return '';
    return folder.replace(/^\/|\/$/g, '');
};

export const uploadToCloudinary = async (file, folder = '', public_id = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Check if public_id already contains a folder path
    const hasEmbeddedFolder = public_id.includes('/');

    // Format folder correctly and ensure it doesn't have leading/trailing slashes
    const formattedFolder = formatCloudinaryFolder(folder);

    // Ensure there's no trailing slash in the folder path
    const sanitizedFolder = formattedFolder.endsWith('/')
        ? formattedFolder.slice(0, -1)
        : formattedFolder;

    // Choose the upload strategy based on the inputs
    if (hasEmbeddedFolder) {
        // If the public_id already has folder structure, use it directly
        // Ensure no trailing slash
        const sanitizedPublicId = public_id.endsWith('/') ? public_id.slice(0, -1) : public_id;
        formData.append('public_id', sanitizedPublicId);
        console.log('Using public_id with embedded path:', sanitizedPublicId);
    } else if (sanitizedFolder) {
        // Use separate folder parameter and public_id parameter (standard approach)
        formData.append('folder', sanitizedFolder);
        if (public_id) {
            formData.append('public_id', public_id);
        }
        console.log('Using folder + public_id:', { folder: sanitizedFolder, public_id });
    } else if (public_id) {
        // Just use public_id with no folder
        formData.append('public_id', public_id);
        console.log('Using public_id only:', public_id);
    } try {
        console.log('Starting Cloudinary upload:', {
            folder: formattedFolder,
            public_id,
            fileType: file.type,
            fileSize: file.size
        });

        const response = await fetch(CLOUDINARY_API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudinary API error:', response.status, errorText);
            throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();        // Log the full Cloudinary response for debugging
        console.log('Full Cloudinary response:', data);
        console.log('Cloudinary response details:', {
            url: data.secure_url,
            public_id: data.public_id,
            asset_id: data.asset_id,
            folder: data.folder,
            path: data.public_id, // This should now include the full path with folder structure
            original_filename: data.original_filename
        });

        // Extract folder from the public_id
        const pathParts = data.public_id.split('/');
        const extractedFileName = pathParts.pop(); // Last part is the file name
        const extractedFolder = pathParts.join('/'); // Everything else is the folder path

        if (data.secure_url) {
            // Return structured data with all the necessary information
            return {
                url: data.secure_url,
                public_id: data.public_id,
                original_name: data.original_filename,
                folder: extractedFolder || formattedFolder, // Use extracted folder if available
                full_path: data.public_id,    // Full path as returned by Cloudinary
                file_name: extractedFileName  // Just the file name portion
            };
        } else {
            throw new Error('Cloudinary upload failed: No secure URL in response');
        }
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};
