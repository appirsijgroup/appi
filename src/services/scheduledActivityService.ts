import { type Activity, type AudienceType } from '@/types';

/**
 * Scheduled Activity Service
 * Handles all activity-related operations via internal APIs
 */

export type ActivityType = 'UMUM' | 'KAJIAN SELASA' | 'PENGAJIAN PERSYARIKATAN' | 'Umum' | 'Kajian Selasa' | 'Pengajian Persyarikatan';
export type ActivityStatus = 'scheduled' | 'postponed' | 'cancelled';
export type AttendanceStatus = 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';

interface DbActivity {
    id: string;
    name: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    created_by: string;
    created_by_name: string | null;
    participant_ids: string[] | null;
    zoom_url: string | null;
    youtube_url: string | null;
    activity_type: ActivityType;
    status: ActivityStatus;
    audience_type: AudienceType;
    audience_rules: any;
    created_at: string;
}

const mapDbToActivity = (dbActivity: DbActivity): Activity => ({
    id: dbActivity.id,
    name: dbActivity.name,
    description: dbActivity.description || undefined,
    date: dbActivity.date,
    startTime: dbActivity.start_time,
    endTime: dbActivity.end_time,
    createdBy: dbActivity.created_by,
    createdByName: dbActivity.created_by_name || undefined,
    participantIds: dbActivity.participant_ids || [],
    zoomUrl: dbActivity.zoom_url || undefined,
    youtubeUrl: dbActivity.youtube_url || undefined,
    activityType: dbActivity.activity_type,
    status: dbActivity.status,
    audienceType: dbActivity.audience_type,
    audienceRules: dbActivity.audience_rules,
    createdAt: dbActivity.created_at
});

export interface ActivityAttendance {
    id: string;
    activityId: string;
    employeeId: string;
    status: AttendanceStatus;
    reason?: string;
    submittedAt: string;
    isLateEntry: boolean;
    notes?: string;
    ipAddress?: string;
    createdAt: string;
    updatedAt: string;
}

interface DbActivityAttendance {
    id: string;
    activity_id: string;
    employee_id: string;
    status: AttendanceStatus;
    reason?: string;
    submitted_at: string;
    is_late_entry: boolean;
    notes?: string;
    ip_address?: string;
    created_at: string;
    updated_at: string;
}


const mapDbToAttendance = (att: DbActivityAttendance): ActivityAttendance => ({
    id: att.id,
    activityId: att.activity_id,
    employeeId: att.employee_id,
    status: att.status,
    reason: att.reason,
    submittedAt: att.submitted_at,
    isLateEntry: att.is_late_entry,
    notes: att.notes,
    ipAddress: att.ip_address,
    createdAt: att.created_at,
    updatedAt: att.updated_at,
});

/**
 * Get all activities
 */
export const getAllActivities = async (creatorId?: string): Promise<Activity[]> => {
    try {
        let url = '/api/activities';
        if (creatorId) url += `?creatorId=${creatorId}`;

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch activities');

        const result = await response.json();
        return (result.data as DbActivity[] || []).map(mapDbToActivity);
    } catch (error) {
        console.error('getAllActivities error:', error);
        return [];
    }
};

/**
 * Get activities for a specific date range
 */
export const getActivitiesByDateRange = async (
    startDate: string,
    endDate: string
): Promise<Activity[]> => {
    try {
        const url = `/api/activities?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch activities');

        const result = await response.json();
        return (result.data as DbActivity[] || []).map(mapDbToActivity);
    } catch (error) {
        console.error('getActivitiesByDateRange error:', error);
        return [];
    }
};

/**
 * Get activities visible to a specific employee
 */
export const getActivitiesForEmployee = async (
    employeeId: string,
    startDate?: string,
    endDate?: string
): Promise<Activity[]> => {
    try {
        // Fetch all activities within range
        const allInPeriod = await getActivitiesByDateRange(startDate || '', endDate || '');

        // Fetch employee data (Basic, should be in context usually, but for service logic:)
        const { getEmployeeById } = await import('./employeeService');
        const employee = await getEmployeeById(employeeId);
        if (!employee) return [];

        // Filter based on audience rules
        return allInPeriod.filter(activity => {
            if (activity.createdBy === employeeId) return true; // Creator always sees their own activity
            if (activity.audienceType === 'public') return true;
            if (activity.audienceType === 'manual') return activity.participantIds?.includes(employeeId);
            if (activity.audienceType === 'rules') {
                const rules = activity.audienceRules || {};

                if (rules.hospitalIds?.length && !rules.hospitalIds.includes(employee.hospitalId || '')) return false;
                if (rules.units?.length && !rules.units.includes(employee.unit || '')) return false;
                if (rules.bagians?.length && !rules.bagians.includes(employee.bagian || '')) return false;
                if (rules.professionCategories?.length && !rules.professionCategories.includes(employee.professionCategory || '')) return false;
                if (rules.professions?.length && !rules.professions.includes(employee.profession || '')) return false;
                if (rules.roles?.length && !rules.roles.includes(employee.role || '')) return false;

                return true;
            }
            return false;
        });
    } catch (error) {
        console.error('getActivitiesForEmployee error:', error);
        return [];
    }
};

/**
 * Create new activity
 */
export const createActivity = async (
    activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<Activity> => {
    const dbData = {
        name: activity.name,
        description: activity.description || null,
        date: activity.date,
        start_time: activity.startTime,
        end_time: activity.endTime,
        created_by: activity.createdBy,
        created_by_name: activity.createdByName || '',
        participant_ids: activity.participantIds || [],
        zoom_url: activity.zoomUrl || null,
        youtube_url: activity.youtubeUrl || null,
        activity_type: activity.activityType || 'Umum',
        status: activity.status || 'scheduled',
        audience_type: activity.audienceType,
        audience_rules: activity.audienceRules || null,
    };

    const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create activity');
    }

    const { data } = await response.json();
    return mapDbToActivity(data);
};

/**
 * Update activity
 */
export const updateActivity = async (
    id: string,
    updates: Partial<Activity>
): Promise<Activity> => {
    const dbData: Partial<DbActivity> & { id: string } = { id };
    if (updates.name !== undefined) dbData.name = updates.name;
    if (updates.description !== undefined) dbData.description = updates.description || null;
    if (updates.date !== undefined) dbData.date = updates.date;
    if (updates.startTime !== undefined) dbData.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbData.end_time = updates.endTime;
    if (updates.participantIds !== undefined) dbData.participant_ids = updates.participantIds;
    if (updates.zoomUrl !== undefined) dbData.zoom_url = updates.zoomUrl || null;
    if (updates.youtubeUrl !== undefined) dbData.youtube_url = updates.youtubeUrl || null;
    if (updates.activityType !== undefined) dbData.activity_type = (updates.activityType as ActivityType);
    if (updates.status !== undefined) dbData.status = (updates.status as ActivityStatus);
    if (updates.audienceType !== undefined) dbData.audience_type = updates.audienceType;
    if (updates.audienceRules !== undefined) dbData.audience_rules = updates.audienceRules;

    const response = await fetch('/api/activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
    }

    const { data } = await response.json();
    return mapDbToActivity(data);
};

/**
 * Delete activity
 */
export const deleteActivity = async (id: string): Promise<void> => {
    const response = await fetch(`/api/activities?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete activity');
    }
};

/**
 * Get attendance for an activity
 */
export const getActivityAttendance = async (activityId: string): Promise<ActivityAttendance[]> => {
    const response = await fetch(`/api/activities/attendance?activityId=${activityId}`, { credentials: 'include' });
    if (!response.ok) return [];
    const { data } = await response.json();
    return (data || []).map(mapDbToAttendance);
};

/**
 * Get attendance for an employee in an activity
 */
export const getEmployeeActivityAttendance = async (
    activityId: string,
    employeeId: string
): Promise<ActivityAttendance | null> => {
    const response = await fetch(`/api/activities/attendance?activityId=${activityId}&employeeId=${employeeId}`, { credentials: 'include' });
    if (!response.ok) return null;
    const { data } = await response.json();
    if (!data || data.length === 0) return null;
    return mapDbToAttendance(data[0]);
};

/**
 * Get all attendance records for an employee
 */
export const getEmployeeScheduledAttendance = async (
    employeeId: string
): Promise<ActivityAttendance[]> => {
    const response = await fetch(`/api/activities/attendance?employeeId=${employeeId}`, { credentials: 'include' });
    if (!response.ok) return [];
    const { data } = await response.json();
    return (data || []).map(mapDbToAttendance);
};

/**
 * Submit attendance for an activity
 */
export const submitScheduledAttendance = async (
    activityId: string,
    employeeId: string,
    status: AttendanceStatus,
    reason?: string
): Promise<ActivityAttendance> => {
    // Check if late
    const activityResponse = await fetch(`/api/activities?id=${activityId}`, { credentials: 'include' });
    let isLate = false;
    if (activityResponse.ok) {
        const { data: act } = await activityResponse.json();
        const activityDateTime = new Date(`${act.date}T${act.end_time}`);
        isLate = new Date() > activityDateTime;
    }

    const response = await fetch('/api/activities/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            activity_id: activityId,
            employee_id: employeeId,
            status,
            reason: reason || null,
            is_late_entry: isLate,
            submitted_at: new Date().toISOString()
        }),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit attendance');
    }

    const { data } = await response.json();
    return mapDbToAttendance(data);
};

/**
 * Get map of activityId -> attendance info
 */
export const getEmployeeActivitiesAttendanceMap = async (
    employeeId: string
): Promise<Record<string, { status: string; submitted: boolean; isLateEntry: boolean }>> => {
    const records = await getEmployeeScheduledAttendance(employeeId);
    const map: Record<string, { status: string; submitted: boolean; isLateEntry: boolean }> = {};
    records.forEach(r => {
        map[r.activityId] = {
            status: r.status,
            submitted: true,
            isLateEntry: r.isLateEntry
        };
    });
    return map;
};

// Aliases for compatibility
export const getScheduledActivitiesForEmployee = getActivitiesForEmployee;
export const getEmployeeActivitiesAttendance = getEmployeeActivitiesAttendanceMap;

/**
 * Convert scheduled attendance to monthlyActivities format
 */
export const convertScheduledActivitiesToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        const attendance = await getEmployeeScheduledAttendance(employeeId);
        if (!attendance.length) return {};

        const result: Record<string, Record<string, Record<string, boolean>>> = {};
        const activities = await getAllActivities();
        const activityMap = new Map(activities.map(a => [a.id, a]));

        attendance.forEach(att => {
            const activity = activityMap.get(att.activityId);
            if (!activity || att.status !== 'hadir') return;

            const monthKey = activity.date.substring(0, 7); // YYYY-MM
            const dayKey = activity.date.substring(8, 10); // DD

            if (!result[monthKey]) result[monthKey] = {};
            if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};

            let activityIdInMutabaah = '';
            const type = activity.activityType.toUpperCase();
            if (type.includes('KAJIAN SELASA')) activityIdInMutabaah = 'kajian_selasa';
            else if (type.includes('PERSYARIKATAN')) activityIdInMutabaah = 'persyarikatan';
            else activityIdInMutabaah = 'umum';

            result[monthKey][dayKey][activityIdInMutabaah] = true;
        });

        return result;
    } catch (error) {
        console.error('convertScheduledActivitiesToActivities error:', error);
        return {};
    }
};
