/**
 * Team Attendance Service
 * Handles team attendance session operations via REST API
 * Local PostgreSQL API
 */

import type { TeamAttendanceSession, TeamAttendanceRecord } from '@/types';

interface DbTeamAttendanceSession {
    id: string;
    creator_id: string;
    creator_name: string;
    type: TeamAttendanceSession['type'];
    date: string;
    start_time: string;
    end_time: string;
    audience_type: TeamAttendanceSession['audienceType'];
    audience_rules: any;
    manual_participant_ids: string[];
    created_at: string;
    updated_at?: string;
    attendance_mode: TeamAttendanceSession['attendanceMode'];
    zoom_url?: string;
    youtube_url?: string;
    presentCount?: number; // 🔥 Added from API response
}


interface DbTeamAttendanceRecord {
    id: string;
    session_id: string;
    user_id: string;
    user_name: string;
    attended_at: string;
    created_at: string;
    session_type: TeamAttendanceSession['type'];
    session_date: string;
    session_start_time: string;
    session_end_time: string;
}



// Helper to convert DB rows to camelCase
const mapSessionToCamelCase = (session: DbTeamAttendanceSession): TeamAttendanceSession => ({
    id: session.id,
    creatorId: session.creator_id,
    creatorName: session.creator_name,
    type: session.type,
    date: session.date,
    startTime: session.start_time,
    endTime: session.end_time,
    audienceType: session.audience_type,
    audienceRules: session.audience_rules,
    manualParticipantIds: session.manual_participant_ids,
    createdAt: new Date(session.created_at).getTime(),
    updatedAt: session.updated_at ? new Date(session.updated_at).getTime() : undefined,
    attendanceMode: session.attendance_mode,
    zoomUrl: session.zoom_url,
    youtubeUrl: session.youtube_url,
    presentCount: session.presentCount || 0 // 🔥 Use dynamic value
});


const mapRecordToCamelCase = (record: DbTeamAttendanceRecord): TeamAttendanceRecord => ({
    id: record.id,
    sessionId: record.session_id,
    userId: record.user_id,
    userName: record.user_name,
    attendedAt: new Date(record.attended_at).getTime(),
    createdAt: new Date(record.created_at).getTime(),
    sessionType: record.session_type,
    sessionDate: record.session_date,
    sessionStartTime: record.session_start_time,
    sessionEndTime: record.session_end_time
});

// Get all team attendance sessions with attendance count
export const getAllTeamAttendanceSessions = async (creatorId?: string): Promise<TeamAttendanceSession[]> => {
    try {
        const url = creatorId
            ? `/api/team-attendance/sessions?creatorId=${creatorId}`
            : '/api/team-attendance/sessions';

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sessions');

        const { data } = await response.json();
        return (data || []).map(mapSessionToCamelCase);
    } catch (error) {
        console.error('getAllTeamAttendanceSessions error:', error);
        return [];
    }
};

// Get sessions for a specific date
export const getSessionsByDate = async (date: string): Promise<TeamAttendanceSession[]> => {
    try {
        const response = await fetch(`/api/team-attendance/sessions?date=${date}`);
        if (!response.ok) throw new Error('Failed to fetch sessions by date');

        const { data } = await response.json();
        return (data || []).map(mapSessionToCamelCase);
    } catch (error) {
        console.error('getSessionsByDate error:', error);
        return [];
    }
};

// Create new team attendance session
export const createTeamAttendanceSession = async (
    session: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'presentCount' | 'updatedAt'>
): Promise<TeamAttendanceSession> => {
    try {
        const dbSession = {
            creator_id: session.creatorId,
            creator_name: session.creatorName,
            type: session.type,
            date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
            audience_type: session.audienceType,
            audience_rules: session.audienceRules,
            manual_participant_ids: session.manualParticipantIds,
            attendance_mode: session.attendanceMode,
            zoom_url: session.zoomUrl,
            youtube_url: session.youtubeUrl
        };

        const response = await fetch('/api/team-attendance/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbSession),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create session');
        }

        const { data } = await response.json();
        return mapSessionToCamelCase(data);
    } catch (error) {
        console.error('createTeamAttendanceSession error:', error);
        throw error;
    }
};

// ============================================================
// TEAM ATTENDANCE RECORDS FUNCTIONS
// ============================================================

// Create attendance record (user klik HADIR)
export const createTeamAttendanceRecord = async (
    record: Omit<TeamAttendanceRecord, 'id' | 'createdAt'>
): Promise<TeamAttendanceRecord> => {
    try {
        const dbRecord = {
            session_id: record.sessionId,
            user_id: record.userId,
            user_name: record.userName,
            attended_at: new Date(record.attendedAt).toISOString(),
            session_type: record.sessionType,
            session_date: record.sessionDate,
            session_start_time: record.sessionStartTime,
            session_end_time: record.sessionEndTime
        };

        const response = await fetch('/api/team-attendance/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbRecord),
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
                throw new Error('Anda sudah melakukan presensi untuk sesi ini.');
            }
            throw new Error(errorData.error || 'Failed to create record');
        }

        const { data } = await response.json();
        return mapRecordToCamelCase(data);
    } catch (error) {
        console.error('createTeamAttendanceRecord error:', error);
        throw error;
    }
};

// Get attendance records for a specific session
export const getAttendanceRecordsForSession = async (sessionId: string): Promise<TeamAttendanceRecord[]> => {
    try {
        const response = await fetch(`/api/team-attendance/records?sessionId=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch records for session');

        const { data } = await response.json();
        return (data || []).map(mapRecordToCamelCase);
    } catch (error) {
        console.error('getAttendanceRecordsForSession error:', error);
        return [];
    }
};

// Get all team attendance records for a specific user
export const getAllTeamAttendanceRecordsForUser = async (userId: string): Promise<TeamAttendanceRecord[]> => {
    try {
        const response = await fetch(`/api/team-attendance/records?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user records');

        const { data } = await response.json();
        return (data || []).map(mapRecordToCamelCase);
    } catch (error) {
        console.error('getAllTeamAttendanceRecordsForUser error:', error);
        return [];
    }
};

// Get attendance records for a specific user (alias for consistency)
export const getAttendanceRecordsForUser = getAllTeamAttendanceRecordsForUser;

// Delete attendance record
export const deleteTeamAttendanceRecord = async (recordId: string): Promise<void> => {
    try {
        const response = await fetch(`/api/team-attendance/records?id=${recordId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete record');
    } catch (error) {
        console.error('deleteTeamAttendanceRecord error:', error);
        throw error;
    }
};

// Check if user has attended a session
export const hasUserAttendedSession = async (sessionId: string, userId: string): Promise<boolean> => {
    try {
        const response = await fetch(`/api/team-attendance/records?sessionId=${sessionId}&userId=${userId}`);
        if (!response.ok) return false;

        const { data } = await response.json();
        return data && data.length > 0;
    } catch (error) {
        console.error('hasUserAttendedSession error:', error);
        return false;
    }
};

// Update session data
export const updateTeamAttendanceSessionData = async (
    sessionId: string,
    updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentCount' | 'updatedAt'>
): Promise<void> => {
    try {
        const dbUpdates = {
            id: sessionId,
            type: updates.type,
            date: updates.date,
            start_time: updates.startTime,
            end_time: updates.endTime,
            attendance_mode: updates.attendanceMode,
            audience_type: updates.audienceType,
            audience_rules: updates.audienceRules,
            manual_participant_ids: updates.manualParticipantIds,
            zoom_url: updates.zoomUrl,
            youtube_url: updates.youtubeUrl,
        };

        const response = await fetch('/api/team-attendance/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbUpdates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update session');
        }
    } catch (error) {
        console.error('updateTeamAttendanceSessionData error:', error);
        throw error;
    }
};

// Delete session
export const deleteTeamAttendanceSession = async (sessionId: string): Promise<void> => {
    try {
        const response = await fetch(`/api/team-attendance/sessions?id=${sessionId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete session');
    } catch (error) {
        console.error('deleteTeamAttendanceSession error:', error);
        throw error;
    }
};

/**
 * Convert team attendance sessions to monthlyActivities format
 * This syncs team attendance (KIE, Doa Bersama) to the dashboard chart
 */
export const convertTeamAttendanceToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        const attendanceRecords = await getAllTeamAttendanceRecordsForUser(employeeId);
        if (!attendanceRecords.length) return {};

        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        attendanceRecords.forEach((record) => {
            const date = record.sessionDate; // YYYY-MM-DD
            const monthKey = date.substring(0, 7); // YYYY-MM
            const dayKey = date.substring(8, 10); // DD
            const sessionType = record.sessionType;

            if (!result[monthKey]) result[monthKey] = {};
            if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};

            const typeLower = sessionType?.toLowerCase().trim();

            if (typeLower === 'kie') {
                result[monthKey][dayKey]['tepat_waktu_kie'] = true;
            } else if (typeLower === 'doa bersama') {
                result[monthKey][dayKey]['doa_bersama'] = true;
            } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
                result[monthKey][dayKey]['tadarus'] = true;
            } else if (typeLower === 'kajian selasa') {
                result[monthKey][dayKey]['kajian_selasa'] = true;
            } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
                result[monthKey][dayKey]['persyarikatan'] = true;
            } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku' || typeLower === 'baca_alquran_buku') {
                result[monthKey][dayKey]['baca_alquran_buku'] = true;
            }
        });

        return result;
    } catch (error) {
        console.error('convertTeamAttendanceToActivities error:', error);
        return {};
    }
};
