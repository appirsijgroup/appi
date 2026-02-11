/**
 * Attendance Audit Service
 * Menggunakan sistem APPEND-ONLY via local API
 */

/**
 * Record attendance menggunakan fungsi append-only via API
 */
export const recordAttendance = async (params: {
    employeeId: string;
    entityId: string;
    date: string;
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';
    reason?: string;
    location?: string;
    source?: string;
    changedBy?: string;
}): Promise<{ success: boolean; error?: string; recordId?: string }> => {
    try {
        const response = await fetch('/api/attendance/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const err = await response.json();
            return { success: false, error: err.error };
        }

        const data = await response.json();
        return { success: true, recordId: data.recordId };
    } catch (error: any) {
        console.error('❌ Exception in recordAttendance:', error);
        return { success: false, error: error.message };
    }
};

interface DbAttendanceAudit {
    id: string;
    employee_id: string;
    entity_id: string;
    date: string;
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';
    reason?: string;
    location?: string;
    source?: string;
    recorded_at: string;
    is_latest: boolean;
}

/**
 * Get attendance records (hanya yang TERBARU)
 */
export const getLatestAttendance = async (params: {
    employeeId: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Record<string, Omit<AttendanceRecord, 'id' | 'employeeId' | 'isLatest'>>> => {
    try {
        const response = await fetch(`/api/attendance/audit?employeeId=${params.employeeId}&type=latest`);
        if (!response.ok) return {};

        const { data } = await response.json();
        const attendanceMap: Record<string, Omit<AttendanceRecord, 'id' | 'employeeId' | 'isLatest'>> = {};
        if (data) {
            (data as DbAttendanceAudit[]).forEach((record: DbAttendanceAudit) => {
                const key = `${record.date}_${record.entity_id}`;
                attendanceMap[key] = {
                    date: record.date,
                    entityId: record.entity_id,
                    status: record.status,
                    reason: record.reason,
                    recordedAt: record.recorded_at
                };
            });
        }
        return attendanceMap;
    } catch (error) {
        console.error('❌ Error getting latest attendance:', error);
        throw error;
    }
};

/**
 * Get attendance history
 */
export const getAttendanceHistory = async (params: {
    employeeId: string;
    entityId?: string;
    date?: string;
}): Promise<AttendanceRecord[]> => {
    try {
        const response = await fetch(`/api/attendance/audit?employeeId=${params.employeeId}&type=history`);
        if (!response.ok) return [];
        const { data } = await response.json();
        const records = (data || []) as DbAttendanceAudit[];
        return records.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            entityId: record.entity_id,
            date: record.date,
            status: record.status,
            reason: record.reason,
            recordedAt: record.recorded_at,
            isLatest: record.is_latest
        }));
    } catch (error) {
        console.error('❌ Error getting attendance history:', error);
        throw error;
    }
};

/**
 * Get attendance changes log
 */
export const getAttendanceChanges = async (params: {
    employeeId: string;
    limit?: number;
}): Promise<AttendanceRecord[]> => {
    try {
        const response = await fetch(`/api/attendance/audit?employeeId=${params.employeeId}&type=changes`);
        if (!response.ok) return [];
        const { data } = await response.json();
        const records = (data || []) as DbAttendanceAudit[];
        return records.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            entityId: record.entity_id,
            date: record.date,
            status: record.status,
            reason: record.reason,
            recordedAt: record.recorded_at,
            isLatest: record.is_latest
        }));
    } catch (error) {
        console.error('❌ Error getting attendance changes:', error);
        throw error;
    }
};

export interface MonthlyActivityAudit {
    id: string;
    employeeId: string;
    activitiesSnapshot: any; // Complex MonthlyActivityProgress
    monthKey: string;
    changedDay?: string;
    activityIdChanged?: string;
    oldValue?: any;
    newValue?: any;
    changeType: 'INITIAL' | 'DAILY_UPDATE' | 'FULL_SAVE' | 'MERGE';
    changedBy?: string;
    changedAt: string;
    source?: string;
    notes?: string;
}

/**
 * Get monthly activities audit history
 */
export const getMonthlyActivitiesHistory = async (params: {
    employeeId: string;
    monthKey?: string;
    limit?: number;
}): Promise<MonthlyActivityAudit[]> => {
    try {
        const response = await fetch(`/api/attendance/audit?employeeId=${params.employeeId}&type=activities`);
        if (!response.ok) return [];
        const { data } = await response.json();
        return (data || []).map((item: any) => ({
            id: item.id,
            employeeId: item.employee_id,
            activitiesSnapshot: item.activities_snapshot,
            monthKey: item.month_key,
            changedDay: item.changed_day,
            activityIdChanged: item.activity_id_changed,
            oldValue: item.old_value,
            newValue: item.new_value,
            changeType: item.change_type,
            changedBy: item.changed_by,
            changedAt: item.changed_at,
            source: item.source,
            notes: item.notes
        }));
    } catch (error) {
        console.error('❌ Error getting monthly activities history:', error);
        throw error;
    }
};

/**
 * Restore employee activities from audit
 */
export const restoreEmployeeActivities = async (_auditId: string): Promise<boolean> => {
    // This requires a more complex backend implementation if we want to restore from API
    // For now, we stub it as it's an admin-only feature that might need dedicated API
    console.warn('restoreEmployeeActivities via API not yet implemented');
    return false;
};

/**
 * Get daily activity changes summary
 */
export const getDailyActivityChanges = async (_params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}): Promise<any[]> => {
    // Stubbed until needed
    return [];
};

// Types
export interface AttendanceRecord {
    id: string;
    employeeId: string;
    entityId: string;
    date: string;
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';
    reason?: string;
    recordedAt: string;
    isLatest: boolean;
}
