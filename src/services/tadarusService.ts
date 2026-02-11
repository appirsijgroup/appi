/**
 * Tadarus Service
 * Handles tadarus sessions and requests operations
 * MIGRATED: Now uses local API instead of Database client
 */

import type { TadarusSession, TadarusRequest } from '@/types';

// Database representation matching the snake_case schema
interface DbTadarusSession {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    category: string;
    notes?: string;
    is_recurring: boolean;
    mentor_id: string;
    participant_ids: string[];
    present_mentee_ids: string[];
    status: string;
    mentor_present: boolean;
    created_at: number;
}

interface DbTadarusRequest {
    id: string;
    mentee_id: string;
    mentee_name: string;
    mentor_id: string;
    date: string;
    category?: string;
    notes?: string;
    requested_at: number;
    status: string;
    reviewed_at?: number;
    created_at: string;
}


// ==================== TADARUS SESSIONS ====================

// Get all tadarus sessions
export const getAllTadarusSessions = async (): Promise<TadarusSession[]> => {
    try {
        const response = await fetch('/api/tadarus/sessions');
        if (!response.ok) {
            console.error('Failed to fetch tadarus sessions');
            return [];
        }

        const result = await response.json();
        const data = result.data || [];

        // Convert snake_case to camelCase
        return data.map((session: DbTadarusSession) => ({
            id: session.id,
            title: session.title,
            date: session.date,
            startTime: session.start_time,
            endTime: session.end_time,
            category: session.category,
            notes: session.notes,
            isRecurring: session.is_recurring,
            mentorId: session.mentor_id,
            participantIds: session.participant_ids || [],
            presentMenteeIds: session.present_mentee_ids || [],
            status: session.status,
            mentorPresent: session.mentor_present,
            createdAt: session.created_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus sessions:', error);
        return [];
    }
};

// Get tadarus sessions for a specific mentor
export const getTadarusSessionsForMentor = async (mentorId: string): Promise<TadarusSession[]> => {
    try {
        const response = await fetch(`/api/tadarus/sessions?mentorId=${mentorId}`);
        if (!response.ok) {
            console.error('Failed to fetch tadarus sessions for mentor');
            return [];
        }

        const result = await response.json();
        const data = result.data || [];

        return data.map((session: DbTadarusSession) => ({
            id: session.id,
            title: session.title,
            date: session.date,
            startTime: session.start_time,
            endTime: session.end_time,
            category: session.category,
            notes: session.notes,
            isRecurring: session.is_recurring,
            mentorId: session.mentor_id,
            participantIds: session.participant_ids || [],
            presentMenteeIds: session.present_mentee_ids || [],
            status: session.status,
            mentorPresent: session.mentor_present,
            createdAt: session.created_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus sessions for mentor:', error);
        return [];
    }
};

// Create new tadarus session
export const createTadarusSession = async (
    session: Omit<TadarusSession, 'id' | 'createdAt'>
): Promise<TadarusSession> => {
    try {
        // Prepare data for database (convert camelCase to snake_case)
        const dbData = {
            title: session.title,
            date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
            category: session.category,
            notes: session.notes || null,
            is_recurring: session.isRecurring || false,
            mentor_id: session.mentorId,
            participant_ids: session.participantIds || [],
            present_mentee_ids: session.presentMenteeIds || [],
            status: session.status || 'open',
            mentor_present: session.mentorPresent ?? true,
        };

        // 🔥 FIX: Use API endpoint to bypass RLS/401 issues on direct Database client
        const response = await fetch('/api/tadarus/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create tadarus session: ${errorData.error || 'Unknown error'} (Code: ${errorData.code || 'HTTP ' + response.status})`);
        }

        const result = await response.json();
        const data = result.data;

        // Convert back to camelCase
        return {
            id: data.id,
            title: data.title,
            date: data.date,
            startTime: data.start_time,
            endTime: data.end_time,
            category: data.category,
            notes: data.notes,
            isRecurring: data.is_recurring,
            mentorId: data.mentor_id,
            participantIds: data.participant_ids || [],
            presentMenteeIds: data.present_mentee_ids || [],
            status: data.status,
            mentorPresent: data.mentor_present,
            createdAt: data.created_at
        };
    } catch (error) {
        throw error;
    }
};

// Update tadarus session
export const updateTadarusSession = async (
    sessionId: string,
    updates: Partial<TadarusSession>
): Promise<void> => {
    const dbUpdates: Partial<DbTadarusSession> & { id: string } = { id: sessionId };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
    if (updates.participantIds !== undefined) dbUpdates.participant_ids = updates.participantIds;
    if (updates.presentMenteeIds !== undefined) dbUpdates.present_mentee_ids = updates.presentMenteeIds;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.mentorPresent !== undefined) dbUpdates.mentor_present = updates.mentorPresent;

    const response = await fetch('/api/tadarus/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
    });

    if (!response.ok) {
        throw new Error('Failed to update tadarus session');
    }
};

// Delete tadarus session
export const deleteTadarusSession = async (sessionId: string): Promise<void> => {
    try {
        const response = await fetch('/api/tadarus/sessions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sessionId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete tadarus session');
        }
    } catch (error) {
        throw error;
    }
};

// ==================== TADARUS REQUESTS ====================

// Get all tadarus requests
export const getAllTadarusRequests = async (): Promise<TadarusRequest[]> => {
    try {
        const response = await fetch('/api/manual-requests/tadarus');
        if (!response.ok) {
            throw new Error('Failed to fetch all tadarus requests');
        }

        const result = await response.json();
        const data = result.data || [];

        // Convert snake_case to camelCase
        return data.map((request: DbTadarusRequest) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching all tadarus requests:', error);
        return [];
    }
};

// Get tadarus requests for a specific mentor
export const getTadarusRequestsForMentor = async (mentorId: string): Promise<TadarusRequest[]> => {
    try {
        const response = await fetch(`/api/manual-requests/tadarus?mentorId=${mentorId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch tadarus requests');
        }

        const result = await response.json();
        const data = result.data || [];

        return data.map((request: DbTadarusRequest) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus requests for mentor:', error);
        return [];
    }
};

// Get tadarus requests for a list of mentees
export const getTadarusRequestsByMenteeIds = async (menteeIds: string[]): Promise<TadarusRequest[]> => {
    try {
        if (menteeIds.length === 0) return [];
        const response = await fetch(`/api/manual-requests/tadarus?menteeIds=${menteeIds.join(',')}`);
        if (!response.ok) {
            throw new Error('Failed to fetch tadarus requests by mentees');
        }

        const result = await response.json();
        const data = result.data || [];

        return data.map((request: DbTadarusRequest) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus requests by mentee IDs:', error);
        return [];
    }
};

// Create new tadarus request
export const createTadarusRequest = async (
    request: Omit<TadarusRequest, 'id'>
): Promise<TadarusRequest> => {
    const dbRequest = {
        mentee_id: request.menteeId,
        mentee_name: request.menteeName,
        mentor_id: request.mentorId,
        date: request.date,
        category: request.category,
        notes: request.notes,
        requested_at: request.requestedAt || Date.now(),
        status: request.status || 'pending'
    };

    const response = await fetch('/api/manual-requests/tadarus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbRequest)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal membuat pengajuan tadarus/sesi');
    }

    const result = await response.json();
    const data = result.data;

    return {
        id: data.id,
        menteeId: data.mentee_id,
        menteeName: data.mentee_name,
        mentorId: data.mentor_id,
        date: data.date,
        category: data.category,
        notes: data.notes,
        requestedAt: data.requested_at,
        status: data.status,
        reviewedAt: data.reviewed_at
    };
};

// Update tadarus request status
export const updateTadarusRequest = async (
    requestId: string,
    updates: Partial<Pick<TadarusRequest, 'status' | 'reviewedAt'>>
): Promise<void> => {
    const dbUpdates: Partial<DbTadarusRequest> & { id: string } = { id: requestId };

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;

    const response = await fetch('/api/manual-requests/tadarus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
    });

    if (!response.ok) {
        throw new Error('Failed to update tadarus request');
    }
};

// Delete tadarus request
export const deleteTadarusRequest = async (requestId: string): Promise<void> => {
    try {
        const response = await fetch('/api/manual-requests/tadarus', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: requestId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete tadarus request');
        }
    } catch (error) {
        throw error;
    }
};

/**
 * 🔥 Convert tadarus sessions to monthlyActivities format
 * This syncs tadarus attendance to the dashboard chart
 * MIGRATED: Now uses API endpoint
 *
 * Input: employeeId
 * Output: { "2026-01": { "21": { tadarus: true } } }
 */
export const convertTadarusSessionsToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        // Fetch sessions where employee was present via API
        const response = await fetch(`/api/tadarus/sessions?employeeId=${employeeId}&present=true`);
        if (!response.ok) {
            console.warn('Failed to fetch tadarus sessions for activities conversion');
            return {};
        }

        const result = await response.json();
        const sessions = result.data || [];

        if (sessions.length === 0) {
            return {};
        }

        const activities: Record<string, Record<string, Record<string, boolean>>> = {};

        sessions.forEach((session: DbTadarusSession) => {
            const date = session.date; // YYYY-MM-DD
            const monthKey = date.substring(0, 7); // YYYY-MM
            const dayKey = date.substring(8, 10); // DD

            if (!activities[monthKey]) {
                activities[monthKey] = {};
            }

            if (!activities[monthKey][dayKey]) {
                activities[monthKey][dayKey] = {};
            }

            // Mark tadarus activity as completed for this day
            activities[monthKey][dayKey]['tadarus'] = true;
        });

        return activities;
    } catch (error) {
        console.error('Error converting tadarus sessions to activities:', error);
        return {};
    }
};
