import { optimizeSignatureImage } from '@/utils/imageUtils';

/**
 * Signature Service
 * Handles user signature (TTD) upload to Storage via local API
 */

// Upload user signature to Storage
export const uploadSignature = async (file: File, employeeId: string): Promise<string> => {
  try {
    // Read file as data URL
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Optimize signature while preserving transparency
    const optimizedBase64 = await optimizeSignatureImage(dataUrl);

    // Convert base64 to blob
    const blobResponse = await fetch(optimizedBase64);
    const blob = await blobResponse.blob();

    const fileName = `${employeeId}-signature.png`;
    const filePath = `${employeeId}/${fileName}`;
    const processedFile = new File([blob], fileName, { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('bucket', 'signatures');
    formData.append('filePath', filePath);

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload signature via API');
    }

    const { publicUrl } = await response.json();
    return publicUrl;
  } catch (error) {
    console.error('Upload signature exception:', error);
    throw error;
  }
};

// Delete user signature from Storage
export const deleteSignature = async (employeeId: string): Promise<void> => {
  try {
    // Correctly using /api/storage/manage with bucket and path
    const response = await fetch(`/api/storage/manage?bucket=signatures&path=${employeeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) return; // Already deleted or not found
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete signature');
    }
  } catch (error) {
    console.error('Delete signature error:', error);
    throw error;
  }
};

// Get signature URL for employee (if exists)
export const getSignatureUrl = (employeeId: string): string => {
  // Returns the expected local path
  return `/uploads/signatures/${employeeId}/${employeeId}-signature.png`;
};
