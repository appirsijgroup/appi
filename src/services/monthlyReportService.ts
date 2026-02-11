import type { MonthlyReportActivity, MonthlyReports, BookReadingEntry, ManualReportEntry } from '@/types';

/**
 * Monthly Report Service
 * Menangani Laporan Manual bulanan (counter-based activities) via local API
 */

// Debounce cache untuk mencegah race condition
const updateReportCache = new Map<string, {
    data: MonthlyReports;
    timestamp: number;
}>();
const DEBOUNCE_REPORT_MS = 500;

const getPendingReportUpdate = (employeeId: string) => {
    const cached = updateReportCache.get(employeeId);
    if (cached && Date.now() - cached.timestamp < DEBOUNCE_REPORT_MS) {
        return cached.data;
    }
    return null;
};

const setPendingReportUpdate = (employeeId: string, data: MonthlyReports) => {
    updateReportCache.set(employeeId, {
        data,
        timestamp: Date.now()
    });
};

/**
 * Get monthly reports untuk satu employee
 */
export const getMonthlyReports = async (employeeId: string): Promise<MonthlyReports> => {
    if (!employeeId) return {};

    try {
        const response = await fetch(`/api/monthly-counters?employeeId=${employeeId}`);
        if (!response.ok) return {};
        const { reports } = await response.json();
        return reports || {};
    } catch (error) {
        console.error('getMonthlyReports error:', error);
        return {};
    }
};

/**
 * Update monthly reports untuk satu employee
 */
export const updateMonthlyReports = async (
    employeeId: string,
    reports: MonthlyReports
): Promise<void> => {
    try {
        const pending = getPendingReportUpdate(employeeId);
        if (pending) {
            reports = { ...pending, ...reports };
        }
        setPendingReportUpdate(employeeId, reports);

        const response = await fetch('/api/monthly-counters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, reports })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update monthly reports');
        }

        updateReportCache.delete(employeeId);
    } catch (error) {
        updateReportCache.delete(employeeId);
        console.error('updateMonthlyReports error:', error);
        throw error;
    }
};

/**
 * Increment counter untuk satu aktivitas di satu bulan
 */
export const incrementMonthlyReportActivity = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    note?: string
): Promise<MonthlyReportActivity> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);
        if (!currentReports[monthKey]) currentReports[monthKey] = {};

        const currentActivity = currentReports[monthKey][activityId];
        const newCount = (currentActivity?.count || 0) + 1;

        currentReports[monthKey][activityId] = {
            count: newCount,
            completedAt: new Date().toISOString(),
            note: note || currentActivity?.note
        };

        await updateMonthlyReports(employeeId, currentReports);
        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('incrementMonthlyReportActivity error:', error);
        throw error;
    }
};

/**
 * Decrement counter untuk satu aktivitas di satu bulan
 */
export const decrementMonthlyReportActivity = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<MonthlyReportActivity> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);
        if (!currentReports[monthKey] || !currentReports[monthKey][activityId]) {
            throw new Error('Activity not found for this month');
        }

        const currentCount = currentReports[monthKey][activityId].count;
        const newCount = Math.max(0, currentCount - 1);

        if (newCount === 0) {
            delete currentReports[monthKey][activityId];
        } else {
            currentReports[monthKey][activityId] = {
                count: newCount,
                completedAt: currentReports[monthKey][activityId].completedAt
            };
        }

        await updateMonthlyReports(employeeId, currentReports);
        return currentReports[monthKey][activityId] || { count: 0 };
    } catch (error) {
        console.error('decrementMonthlyReportActivity error:', error);
        throw error;
    }
};

/**
 * Get counter untuk satu aktivitas di satu bulan
 */
export const getMonthlyReportActivityCount = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<number> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.count || 0;
    } catch (error) {
        console.error('getMonthlyReportActivityCount error:', error);
        return 0;
    }
};

/**
 * Hapus semua data untuk satu bulan (untuk reset)
 */
export const deleteMonthlyReportsForMonth = async (
    employeeId: string,
    monthKey: string
): Promise<void> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);
        if (currentReports[monthKey]) {
            delete currentReports[monthKey];
            await updateMonthlyReports(employeeId, currentReports);
        }
    } catch (error) {
        console.error('deleteMonthlyReportsForMonth error:', error);
        throw error;
    }
};

/**
 * Tambah book reading entry (dengan judul buku dan halaman)
 */
export const addBookReadingReport = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    bookTitle: string,
    pagesRead: string,
    dateCompleted: string
): Promise<MonthlyReportActivity> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);
        if (!currentReports[monthKey]) currentReports[monthKey] = {};

        const currentActivity = currentReports[monthKey][activityId];
        const currentBookEntries = currentActivity?.bookEntries || [];

        const newEntry: BookReadingEntry = {
            bookTitle,
            pagesRead,
            dateCompleted,
            completedAt: new Date().toISOString()
        };

        const updatedBookEntries = [...currentBookEntries, newEntry];

        currentReports[monthKey][activityId] = {
            count: updatedBookEntries.length,
            bookEntries: updatedBookEntries,
            completedAt: new Date().toISOString()
        };

        await updateMonthlyReports(employeeId, currentReports);
        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('addBookReadingReport error:', error);
        throw error;
    }
};

/**
 * Tambah manual report per tanggal
 */
export const addManualReportByDate = async (
    employeeId: string,
    monthKey: string,
    activityId: string,
    reportDate: string,
    note?: string
): Promise<MonthlyReportActivity> => {
    try {
        const currentReports = await getMonthlyReports(employeeId);
        if (!currentReports[monthKey]) currentReports[monthKey] = {};

        const currentActivity = currentReports[monthKey][activityId];
        const currentEntries = currentActivity?.entries || [];

        const isDuplicate = currentEntries.some((entry: ManualReportEntry) => entry.date === reportDate);
        if (isDuplicate) {
            throw new Error(`Aktivitas sudah dilaporkan untuk tanggal ${reportDate}`);
        }

        const newEntry: ManualReportEntry = {
            date: reportDate,
            completedAt: new Date().toISOString(),
            note: note
        };

        const updatedEntries = [...currentEntries, newEntry];

        currentReports[monthKey][activityId] = {
            count: updatedEntries.length,
            entries: updatedEntries,
            completedAt: new Date().toISOString()
        };

        await updateMonthlyReports(employeeId, currentReports);
        return currentReports[monthKey][activityId];
    } catch (error) {
        console.error('addManualReportByDate error:', error);
        throw error;
    }
};

/**
 * Get book reading entries
 */
export const getBookReadingEntries = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<BookReadingEntry[]> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.bookEntries || [];
    } catch (error) {
        console.error('getBookReadingEntries error:', error);
        return [];
    }
};

/**
 * Get manual report entries
 */
export const getManualReportEntries = async (
    employeeId: string,
    monthKey: string,
    activityId: string
): Promise<ManualReportEntry[]> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        return reports[monthKey]?.[activityId]?.entries || [];
    } catch (error) {
        console.error('getManualReportEntries error:', error);
        return [];
    }
};

/**
 * Convert employee_monthly_reports data to monthlyActivities format
 */
export const convertMonthlyReportsToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        const reports = await getMonthlyReports(employeeId);
        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        Object.entries(reports).forEach(([monthKey, monthData]) => {
            if (!result[monthKey]) result[monthKey] = {};

            Object.entries(monthData).forEach(([activityId, activityData]) => {
                if (activityData.entries && Array.isArray(activityData.entries)) {
                    activityData.entries.forEach((entry: ManualReportEntry) => {
                        if (!entry?.date) return;
                        const dayKey = entry.date.substring(8, 10);
                        if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};
                        result[monthKey][dayKey][activityId] = true;
                    });
                }

                if (activityData.bookEntries && Array.isArray(activityData.bookEntries)) {
                    activityData.bookEntries.forEach((entry: BookReadingEntry) => {
                        if (!entry?.dateCompleted) return;
                        const dayKey = entry.dateCompleted.substring(8, 10);
                        if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};
                        result[monthKey][dayKey][activityId] = true;
                    });
                }

                if (!activityData.entries && !activityData.bookEntries && activityData.completedAt) {
                    const completedDate = new Date(activityData.completedAt);
                    const dayKey = String(completedDate.getDate()).padStart(2, '0');
                    const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
                    if (completedMonthKey === monthKey) {
                        if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};
                        result[monthKey][dayKey][activityId] = true;
                    }
                }
            });
        });

        return result;
    } catch (error) {
        console.error('convertMonthlyReportsToActivities error:', error);
        return {};
    }
};
