import type { MonthlyActivityProgress } from '@/types';

/**
 * Monthly Activity Service
 * Handles all monthly activity-related database operations via internal APIs
 */

/**
 * Get monthly activities for an employee (with optional month/year filter)
 */
export const getMonthlyActivities = async (
    employeeId: string,
    month?: number,
    year?: number
): Promise<Record<string, MonthlyActivityProgress>> => {
    try {
        let url = `/api/monthly-activities?employeeId=${encodeURIComponent(employeeId)}`;
        if (month) url += `&month=${month}`;
        if (year) url += `&year=${year}`;

        const response = await fetch(url, { credentials: 'include' });

        if (!response.ok) {
            console.warn(`⚠️ [getMonthlyActivities] HTTP ${response.status} for employeeId: ${employeeId}`);
            return {};
        }

        const result = await response.json();
        return result.activities || {};
    } catch (err) {
        console.warn(`⚠️ [getMonthlyActivities] Error for employeeId: ${employeeId}`, err);
        return {};
    }
};

/**
 * Update monthly activities (Deprecated - Activities are now stored in separate tables)
 */
export const updateMonthlyActivities = async (
    _employeeId: string,
    _monthlyActivities: Record<string, MonthlyActivityProgress>
): Promise<void> => {
    // No-op for backward compatibility
    return Promise.resolve();
};

/**
 * Get activated months for an employee
 */
export const getActivatedMonths = async (employeeId: string): Promise<string[]> => {
    try {
        const response = await fetch(`/api/activated-months?employeeId=${encodeURIComponent(employeeId)}`, { credentials: 'include' });
        if (!response.ok) return [];

        const result = await response.json();
        return result.activatedMonths || [];
    } catch (err) {
        console.error('getActivatedMonths error:', err);
        return [];
    }
};

/**
 * Activate a month for an employee
 */
export const activateMonth = async (
    employeeId: string,
    monthKey: string
): Promise<boolean> => {
    try {
        const response = await fetch('/api/activated-months', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, monthKey }),
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to activate month: ${error.error}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('activateMonth error:', error);
        return false;
    }
};

/**
 * Update monthly progress (Deprecated - Activities are now stored in separate tables)
 */
export const updateMonthlyProgress = async (
    _employeeId: string,
    _monthKey: string,
    _progress: MonthlyActivityProgress
): Promise<boolean> => {
    return true;
};

/**
 * Get all monthly activities and activated months for an employee
 */
export const getEmployeeMonthlyData = async (employeeId: string): Promise<{
    monthlyActivities: Record<string, MonthlyActivityProgress>;
    activatedMonths: string[];
}> => {
    try {
        const [activities, activatedMonths] = await Promise.all([
            getMonthlyActivities(employeeId),
            getActivatedMonths(employeeId)
        ]);

        return {
            monthlyActivities: activities,
            activatedMonths: activatedMonths
        };
    } catch (err) {
        console.error('getEmployeeMonthlyData error:', err);
        return {
            monthlyActivities: {},
            activatedMonths: []
        };
    }
};