import type { SunnahIbadah } from '@/types';

/**
 * Sunnah Ibadah Service
 * Handles all sunnah ibadah configuration via local API
 */

// Get all sunnah ibadah from API
export const getAllSunnahIbadah = async (): Promise<SunnahIbadah[]> => {
  try {
    const response = await fetch('/api/admin/sunnah-ibadah');
    if (!response.ok) return [];
    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error('getAllSunnahIbadah error:', error);
    return [];
  }
};

// Create new sunnah ibadah
export const createSunnahIbadah = async (
  ibadah: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>,
  _creator: { id: string; name: string } // Creator is now handled by API session
): Promise<SunnahIbadah> => {
  try {
    const response = await fetch('/api/admin/sunnah-ibadah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ibadah)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create sunnah ibadah');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('createSunnahIbadah error:', error);
    throw error;
  }
};

// Update sunnah ibadah
export const updateSunnahIbadahInDb = async (
  id: string,
  updates: Partial<SunnahIbadah>
): Promise<void> => {
  try {
    const response = await fetch('/api/admin/sunnah-ibadah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, id })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update sunnah ibadah');
    }
  } catch (error) {
    console.error('updateSunnahIbadahInDb error:', error);
    throw error;
  }
};

// Delete sunnah ibadah
export const deleteSunnahIbadahFromDb = async (id: string): Promise<void> => {
  try {
    const response = await fetch('/api/admin/sunnah-ibadah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete sunnah ibadah');
    }
  } catch (error) {
    console.error('deleteSunnahIbadahFromDb error:', error);
    throw error;
  }
};
