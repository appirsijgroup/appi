import { convertImageToWebP } from '@/utils/imageUtils';

/**
 * Profile Picture Service
 * Handles user profile picture upload to Storage via local API
 */

// Upload user profile picture to Storage
export const uploadProfilePicture = async (file: File, employeeId: string): Promise<string> => {
    try {
        // Convert to WebP for optimization
        const webpFile = await convertImageToWebP(file, 0.7);
        const fileName = `${employeeId}-profile.webp`;
        const filePath = `${employeeId}/${fileName}`;

        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('bucket', 'avatars');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload profile picture via API');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        console.error('Upload profile picture exception:', error);
        throw error;
    }
};

// Delete user profile picture from Storage
export const deleteProfilePicture = async (employeeId: string): Promise<void> => {
    try {
        const response = await fetch(`/api/storage/manage?bucket=avatars&path=${employeeId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            if (response.status === 404) return; // Ignore if directory already gone
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete profile picture');
        }
    } catch (error) {
        console.error('Delete profile picture error:', error);
        throw error;
    }
};
