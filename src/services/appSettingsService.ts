export type AppSettingsKey = 'mutabaah_locking_mode';

export interface AppSetting {
    key: string;
    value: string;
    description?: string;
    updated_at: string;
    updated_by?: string;
}

/**
 * Get a setting value by key via API
 */
export const getAppSetting = async (key: AppSettingsKey): Promise<string | null> => {
    try {
        const response = await fetch(`/api/settings?key=${key}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('getAppSetting error:', error);
        return null;
    }
};

/**
 * Get all settings via API
 */
export const getAllSettings = async (): Promise<Record<string, string>> => {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) return {};
        const data = await response.json();
        return data.settings || {};
    } catch (error) {
        console.error('getAllSettings error:', error);
        return {};
    }
};

/**
 * Update a setting value via API (only for super-admin)
 */
export const updateAppSetting = async (
    key: AppSettingsKey,
    value: string,
    _userId?: string // userId is now handled by the API session
): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });

        if (!response.ok) {
            const err = await response.json();
            return { success: false, error: err.error || 'Failed to update setting' };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};
