import type { Hospital } from '@/types';

/**
 * Hospital Service
 * Handles all hospital-related operations via API calls
 * CLIENT-SAFE: Uses fetch API instead of direct database access
 */

import { convertImageToWebP } from '@/utils/imageUtils';

// Upload hospital logo to Storage
export const uploadHospitalLogo = async (file: File, hospitalId: string): Promise<string> => {
    try {
        const webpFile = await convertImageToWebP(file);
        // Use fixed filename to overwrite existing logo and prevent duplicates
        const fileName = `${hospitalId}-logo.webp`;
        const filePath = `${hospitalId}/${fileName}`;

        // Use API endpoint for storage
        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('bucket', 'Logo');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload hospital logo via API');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        throw error;
    }
};

// Get all hospitals
export const getAllHospitals = async (): Promise<Hospital[]> => {
    try {
        const response = await fetch('/api/hospitals');

        if (!response.ok) {
            console.error('Failed to fetch hospitals');
            return [];
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        return [];
    }
};

// Get hospital by ID
export const getHospitalById = async (id: string): Promise<Hospital | null> => {
    try {
        const response = await fetch(`/api/hospitals?id=${id}`);

        if (!response.ok) {
            if (response.status === 404) return null;
            console.error('Failed to fetch hospital');
            return null;
        }

        const result = await response.json();
        return result.data || null;
    } catch (error) {
        console.error('Error fetching hospital by ID:', error);
        return null;
    }
};

// Create new hospital
export const createHospital = async (hospital: Omit<Hospital, 'id'>): Promise<Hospital> => {
    const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hospital)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create hospital');
    }

    const result = await response.json();
    return result.data;
};

// Update hospital
export const updateHospital = async (
    id: string,
    updates: Partial<Omit<Hospital, 'id'>>
): Promise<Hospital> => {
    const response = await fetch('/api/hospitals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update hospital');
    }

    const result = await response.json();
    return result.data;
};

// Delete hospital
export const deleteHospital = async (id: string): Promise<void> => {
    const response = await fetch(`/api/hospitals?id=${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete hospital');
    }
};

// Toggle hospital active status
export const toggleHospitalStatus = async (id: string): Promise<Hospital> => {
    // First get current status
    const hospital = await getHospitalById(id);
    if (!hospital) throw new Error('Hospital not found');

    const newStatus = !hospital.isActive;

    return updateHospital(id, { isActive: newStatus });
};
