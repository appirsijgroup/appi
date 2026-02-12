import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity, TeamAttendanceSession, TeamAttendanceRecord } from '@/types';

interface ActivityState {
    activities: Activity[];
    teamAttendanceSessions: TeamAttendanceSession[];
    teamAttendanceRecords: TeamAttendanceRecord[];
    isLoadingTeamAttendance: boolean;
    isLoadingActivities: boolean;
    teamAttendanceError: string | null;
    activitiesError: string | null;
    addActivity: (activity: Activity) => Promise<void>;
    updateActivity: (activityId: string, updates: Partial<Activity>) => Promise<void>;
    deleteActivity: (activityId: string) => Promise<void>;
    addTeamAttendanceSessions: (sessions: TeamAttendanceSession[]) => Promise<void>;
    createTeamAttendanceRecord: (record: Omit<TeamAttendanceRecord, 'id' | 'createdAt'>) => Promise<void>;
    updateTeamAttendanceSessionData: (sessionId: string, updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentCount' | 'updatedAt'>) => Promise<void>;
    deleteTeamAttendanceSession: (sessionId: string) => Promise<void>;
    loadTeamAttendanceSessions: (creatorId?: string) => Promise<void>;
    loadActivities: (employeeId?: string, creatorId?: string) => Promise<void>;
    hasUserAttendedSession: (sessionId: string, userId: string) => Promise<boolean>;
    getAttendanceRecordsForSession: (sessionId: string) => Promise<TeamAttendanceRecord[]>;
    submitBatchAttendance: (sessionId: string, userIds: string[]) => Promise<void>;
}

export const useActivityStore = create<ActivityState>()(
    persist(
        (set, get) => ({
            activities: [],
            teamAttendanceSessions: [],
            teamAttendanceRecords: [],
            isLoadingTeamAttendance: false,
            isLoadingActivities: false,
            teamAttendanceError: null,
            activitiesError: null,
            addActivity: async (activity) => {
                try {
                    const { createActivity: createService } = await import('@/services/scheduledActivityService');
                    const createdActivity = await createService(activity);
                    set((state) => ({ activities: [...state.activities, createdActivity] }));
                } catch (error) {
                    console.error('Failed to create activity:', error);
                    throw error;
                }
            },

            updateActivity: async (activityId, updates) => {
                try {
                    const { updateActivity: updateService } = await import('@/services/scheduledActivityService');
                    await updateService(activityId, updates);
                    set((state) => ({
                        activities: state.activities.map(act => act.id === activityId ? { ...act, ...updates } : act)
                    }));
                } catch (error) {
                    console.error('Failed to update activity:', error);
                    throw error;
                }
            },

            deleteActivity: async (activityId) => {
                try {
                    const { deleteActivity: deleteService } = await import('@/services/scheduledActivityService');
                    await deleteService(activityId);
                    set((state) => ({
                        activities: state.activities.filter(act => act.id !== activityId)
                    }));
                } catch (error) {
                    console.error('Failed to delete activity:', error);
                    throw error;
                }
            },
            addTeamAttendanceSessions: async (sessions) => {
                try {
                    const { createTeamAttendanceSession: createService } = await import('@/services/teamAttendanceService');
                    const createdSessions = await Promise.all(
                        sessions.map(session => createService(session))
                    );
                    set((state) => ({
                        teamAttendanceSessions: [...state.teamAttendanceSessions, ...createdSessions]
                    }));
                } catch (error) {
                    console.error('Failed to create team attendance sessions:', error);
                    throw error;
                }
            },

            createTeamAttendanceRecord: async (record) => {
                try {
                    const { createTeamAttendanceRecord: createService } = await import('@/services/teamAttendanceService');
                    const newRecord = await createService(record);
                    set((state) => ({
                        teamAttendanceRecords: [...state.teamAttendanceRecords, newRecord],
                        teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                            sess.id === record.sessionId
                                ? { ...sess, presentCount: (sess.presentCount || 0) + 1 }
                                : sess
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            updateTeamAttendanceSessionData: async (sessionId, updates) => {
                try {
                    const { updateTeamAttendanceSessionData: updateService } = await import('@/services/teamAttendanceService');
                    await updateService(sessionId, updates);
                    set((state) => ({
                        teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                            sess.id === sessionId ? { ...sess, ...updates } : sess
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            deleteTeamAttendanceSession: async (sessionId) => {
                try {
                    const { deleteTeamAttendanceSession: deleteService } = await import('@/services/teamAttendanceService');
                    await deleteService(sessionId);
                    set((state) => ({
                        teamAttendanceSessions: state.teamAttendanceSessions.filter(sess => sess.id !== sessionId),
                        teamAttendanceRecords: state.teamAttendanceRecords.filter(rec => rec.sessionId !== sessionId)
                    }));
                } catch (error) {
                    throw error;
                }
            },

            loadTeamAttendanceSessions: async (creatorId?: string) => {
                if (get().teamAttendanceSessions.length === 0) {
                    set({ isLoadingTeamAttendance: true, teamAttendanceError: null });
                }

                try {
                    const { getAllTeamAttendanceSessions } = await import('@/services/teamAttendanceService');
                    const sessions = await getAllTeamAttendanceSessions(creatorId);
                    set({
                        teamAttendanceSessions: sessions,
                        isLoadingTeamAttendance: false,
                        teamAttendanceError: null
                    });

                } catch (error) {
                    set({
                        teamAttendanceError: error instanceof Error ? error.message : 'Failed to load sessions',
                        isLoadingTeamAttendance: false
                    });
                }
            },

            loadActivities: async (employeeId?: string, creatorId?: string) => {
                if (get().activities.length === 0) {
                    set({ isLoadingActivities: true, activitiesError: null });
                }

                try {
                    const { getAllActivities, getActivitiesForEmployee } = await import('@/services/scheduledActivityService');
                    let activities;

                    if (employeeId) {
                        activities = await getActivitiesForEmployee(employeeId);
                    } else {
                        activities = await getAllActivities(creatorId);
                    }

                    set({
                        activities: activities,
                        isLoadingActivities: false,
                        activitiesError: null
                    });

                } catch (error) {
                    set({
                        activitiesError: error instanceof Error ? error.message : 'Failed to load activities',
                        isLoadingActivities: false
                    });
                }
            },

            hasUserAttendedSession: async (sessionId: string, userId: string) => {
                try {
                    const { hasUserAttendedSession: checkService } = await import('@/services/teamAttendanceService');
                    return await checkService(sessionId, userId);
                } catch (error) {
                    console.error('Error checking attendance:', error);
                    return false;
                }
            },

            getAttendanceRecordsForSession: async (sessionId: string) => {
                try {
                    const { getAttendanceRecordsForSession: getService } = await import('@/services/teamAttendanceService');
                    return await getService(sessionId);
                } catch (error) {
                    console.error('Error getting attendance records:', error);
                    return [];
                }
            },

            submitBatchAttendance: async (sessionId: string, userIds: string[]) => {
                try {
                    const teamService = await import('@/services/teamAttendanceService');
                    const store = get();

                    // 1. Get Session Data and Existing Records
                    const session = store.teamAttendanceSessions.find(s => s.id === sessionId);
                    if (!session) throw new Error("Session not found");

                    const existingRecords = await teamService.getAttendanceRecordsForSession(sessionId);
                    const existingUserIds = new Set(existingRecords.map(r => r.userId));
                    const newUserIdsSet = new Set(userIds);

                    // 2. Determine who to ADD
                    // We only support ADDING for now based on requirement to avoid accidental deletions until delete service is robust
                    const toAdd = userIds.filter(uid => !existingUserIds.has(uid));

                    const addedRecords: TeamAttendanceRecord[] = [];

                    for (const userId of toAdd) {
                        const timestamp = Date.now();
                        const record = {
                            sessionId,
                            userId: userId,
                            userName: 'Peserta',
                            attendedAt: timestamp,
                            sessionType: session.type,
                            sessionDate: session.date,
                            sessionStartTime: session.startTime,
                            sessionEndTime: session.endTime,
                            status: 'hadir'
                        };

                        const created = await teamService.createTeamAttendanceRecord(record as any);
                        addedRecords.push(created);
                    }

                    // 4. Update Local State
                    set((state) => ({
                        teamAttendanceRecords: [...state.teamAttendanceRecords, ...addedRecords],
                        teamAttendanceSessions: state.teamAttendanceSessions.map(sess =>
                            sess.id === sessionId
                                ? { ...sess, presentCount: existingUserIds.size + addedRecords.length }
                                : sess
                        )
                    }));

                } catch (error) {
                    console.error('Error submitting batch attendance:', error);
                    throw error;
                }
            },
        }),
        {
            name: 'activity-storage',
        }
    )
);
