/**
 * Prayer Attendance Service
 * Mengambil data presensi sholat untuk laporan via local API
 */

export interface PrayerAttendanceData {
    employee_id: string;
    employee_name: string;
    unit: string;
    profession_category: string;
    profession: string;
    date: string;
    entity_id: string; // subuh, dzuhur, ashar, maghrib, isya
    status: 'Hadir' | 'Tidak Hadir';
}

/**
 * Get all prayer attendance records untuk laporan
 */
export const getAllPrayerAttendance = async (
    startDate?: string,
    endDate?: string
): Promise<PrayerAttendanceData[]> => {
    try {
        let url = '/api/reports/prayer-attendance';
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) return [];

        const { data } = await response.json();
        return data || [];
    } catch (error) {
        console.error('Error in getAllPrayerAttendance:', error);
        return [];
    }
};
