import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MonthlyReportSubmission, TadarusSession, TadarusRequest, MissedPrayerRequest, MenteeTarget } from '@/types';
import { useAuthStore } from './authStore';

interface GuidanceState {
    monthlyReportSubmissions: MonthlyReportSubmission[];
    tadarusSessions: TadarusSession[];
    tadarusRequests: TadarusRequest[];
    missedPrayerRequests: MissedPrayerRequest[];
    menteeTargets: MenteeTarget[];

    // Actions
    addOrUpdateMonthlyReportSubmission: (submission: MonthlyReportSubmission) => void;

    addTadarusSessions: (sessions: TadarusSession[]) => void;
    updateTadarusSession: (sessionId: string, updates: Partial<TadarusSession> | ((session: TadarusSession) => TadarusSession)) => Promise<void>;
    deleteTadarusSession: (sessionId: string) => Promise<void>;
    loadTadarusSessions: () => Promise<void>;
    loadTadarusRequests: () => Promise<void>;
    loadMissedPrayerRequests: () => Promise<void>;
    loadMonthlyReportSubmissions: () => Promise<void>;
    loadTeamReadingHistory: () => Promise<void>;

    addOrUpdateTadarusRequest: (request: TadarusRequest) => Promise<void>;

    addOrUpdateMissedPrayerRequest: (request: MissedPrayerRequest) => void;

    addMenteeTarget: (target: MenteeTarget) => void;
    updateMenteeTarget: (targetId: string, updates: Partial<MenteeTarget>) => void;
    deleteMenteeTarget: (targetId: string) => void;
}

export const useGuidanceStore = create<GuidanceState>()(
    persist(
        (set, get) => ({
            monthlyReportSubmissions: [],
            tadarusSessions: [],
            tadarusRequests: [],
            missedPrayerRequests: [],
            menteeTargets: [],

            addOrUpdateMonthlyReportSubmission: (submission) => set((state) => {
                const index = state.monthlyReportSubmissions.findIndex(s => s.id === submission.id);
                if (index !== -1) {
                    const newSubmissions = [...state.monthlyReportSubmissions];
                    newSubmissions[index] = submission;
                    return { monthlyReportSubmissions: newSubmissions };
                }
                return { monthlyReportSubmissions: [...state.monthlyReportSubmissions, submission] };
            }),

            addTadarusSessions: (sessions) => set((state) => ({
                tadarusSessions: [...state.tadarusSessions, ...sessions]
            })),

            updateTadarusSession: async (sessionId, updates) => {
                try {
                    const { updateTadarusSession: updateService } = await import('@/services/tadarusService');
                    const updateData = typeof updates === 'function' ? updates({} as TadarusSession) : updates;
                    await updateService(sessionId, updateData);

                    // Then update local state
                    set((state) => ({
                        tadarusSessions: state.tadarusSessions.map(session =>
                            session.id === sessionId
                                ? typeof updates === 'function'
                                    ? updates(session)
                                    : { ...session, ...updates }
                                : session
                        )
                    }));
                } catch (error) {
                    throw error;
                }
            },

            deleteTadarusSession: async (sessionId) => {
                try {
                    // Delete from Database first
                    const { deleteTadarusSession: deleteService } = await import('@/services/tadarusService');
                    await deleteService(sessionId);

                    // Then update local state
                    set((state) => ({
                        tadarusSessions: state.tadarusSessions.filter(s => s.id !== sessionId)
                    }));
                } catch (error) {
                    throw error;
                }
            },

            loadTadarusSessions: async () => {
                try {
                    const { getAllTadarusSessions } = await import('@/services/tadarusService');
                    const sessions = await getAllTadarusSessions();
                    set({ tadarusSessions: sessions });
                } catch (error) {
                    throw error;
                }
            },

            loadTadarusRequests: async () => {
                try {
                    const { getAllTadarusRequests, getTadarusRequestsForMentor, getTadarusRequestsByMenteeIds } = await import('@/services/tadarusService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAuthStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests: TadarusRequest[] = [];

                    // 1. ALWAYS Fetch "My Requests" (as a Mentee) - regardless of role
                    let myRequests: TadarusRequest[] = [];
                    try {
                        const response = await fetch(`/api/manual-requests/tadarus?menteeId=${loggedInEmployee.id}`);
                        if (response.ok) {
                            const result = await response.json();
                            const rawData = result.data || [];
                            myRequests = rawData.map((request: Record<string, unknown>) => ({
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
                        }
                    } catch (e) {
                        console.error("Error fetching my requests:", e);
                    }

                    // 2. Fetch Additional Requests based on Role
                    if (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllTadarusRequests();
                    } else if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeKaUnit || loggedInEmployee.canBeDirut) {
                        // A. Fetch by Mentor ID (for history/assigned)
                        const assignedRequests = await getTadarusRequestsForMentor(loggedInEmployee.id);

                        // B. Fetch by current Team (so it follows the mentee if they move)
                        const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);
                        const teamRequests = await getTadarusRequestsByMenteeIds(currentMenteeIds);

                        // C. Merge ALL (Assigned + Team)
                        requests = [...assignedRequests, ...teamRequests];
                    }

                    // 3. MERGE My Requests + Role Requests unique by ID
                    const requestMap = new Map<string, TadarusRequest>();

                    // Prioritize Role Requests first
                    requests.forEach(r => requestMap.set(r.id, r));

                    // Add My Requests if not exists
                    myRequests.forEach(r => requestMap.set(r.id, r));

                    set({ tadarusRequests: Array.from(requestMap.values()) });
                } catch (error) {
                    throw error;
                }
            },

            loadMissedPrayerRequests: async () => {
                try {
                    const { getAllMissedPrayerRequests, getMissedPrayerRequestsForMentor, getMissedPrayerRequestsForMentee, getMissedPrayerRequestsByMenteeIds } = await import('@/services/prayerRequestService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAuthStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    let requests: MissedPrayerRequest[] = [];

                    // 1. ALWAYS Fetch "My Requests" (as a Mentee)
                    let myRequests: MissedPrayerRequest[] = [];
                    try {
                        myRequests = await getMissedPrayerRequestsForMentee(loggedInEmployee.id);
                    } catch (e) {
                        console.error("Error fetching my prayer requests:", e);
                    }

                    // 2. Fetch Additional Requests based on Role
                    if (loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin') {
                        requests = await getAllMissedPrayerRequests();
                    } else if (loggedInEmployee.canBeMentor || loggedInEmployee.canBeKaUnit || loggedInEmployee.canBeDirut) {
                        // A. Fetch by Mentor ID
                        const assignedRequests = await getMissedPrayerRequestsForMentor(loggedInEmployee.id);

                        // B. Fetch by current Team
                        const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);
                        const teamRequests = await getMissedPrayerRequestsByMenteeIds(currentMenteeIds);

                        // C. Merge ALL
                        requests = [...assignedRequests, ...teamRequests];
                    }

                    // 3. MERGE My Requests + Role Requests unique by ID
                    const requestMap = new Map<string, MissedPrayerRequest>();

                    // Role requests first
                    requests.forEach(r => requestMap.set(r.id, r));

                    // Add My Requests if not exists
                    myRequests.forEach(r => requestMap.set(r.id, r));

                    set({ missedPrayerRequests: Array.from(requestMap.values()) });
                } catch (error) {
                    throw error;
                }
            },

            loadMonthlyReportSubmissions: async () => {
                try {
                    const { getMonthlyReportsForSuperiorCombined, getUserMonthlyReports, getMonthlyReportsByMenteeIds } = await import('@/services/monthlySubmissionService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const loggedInEmployee = useAuthStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    const mergedSubmissions = new Map<string, MonthlyReportSubmission>();

                    // --- PHASE 1: SNAPSHOT & OWN REPORTS (FASTEST) ---
                    // Load reports where this user is explicitly assigned as superior (Handles history accurately)
                    const rolesToFetch: Array<'mentorId' | 'kaUnitId'> = [];
                    if (loggedInEmployee.canBeMentor) rolesToFetch.push('mentorId');
                    if (loggedInEmployee.canBeKaUnit) rolesToFetch.push('kaUnitId');

                    // Fetch my own reports and snapshot-assigned reports in parallel
                    const [snapshotResults, myReports] = await Promise.all([
                        getMonthlyReportsForSuperiorCombined(loggedInEmployee.id, rolesToFetch),
                        getUserMonthlyReports(loggedInEmployee.id)
                    ]);

                    snapshotResults.forEach(sub => mergedSubmissions.set(sub.id, sub));
                    myReports.forEach(sub => mergedSubmissions.set(sub.id, sub));

                    // 🔥 OPTIMISTIC UPDATE: Show immediate results to user
                    if (mergedSubmissions.size > 0) {
                        set({ monthlyReportSubmissions: Array.from(mergedSubmissions.values()) });
                    }

                    // --- PHASE 2: REAL-TIME MENTEE FALLBACK (ACCURACY FOR OLD DATA) ---
                    // Some old reports might have empty snapshot IDs. We find them via current mentoring relations.
                    // Instead of waiting for the massive allUsersData load, we query IDs directly.
                    const currentMenteeIds = await getManagedEmployeeIds(loggedInEmployee.id);

                    if (currentMenteeIds.length > 0) {
                        const menteeResults = await getMonthlyReportsByMenteeIds(currentMenteeIds);

                        let hasNew = false;
                        menteeResults.forEach(sub => {
                            if (!mergedSubmissions.has(sub.id)) {
                                mergedSubmissions.set(sub.id, sub);
                                hasNew = true;
                            }
                        });

                        if (hasNew || mergedSubmissions.size === 0) {
                            set({ monthlyReportSubmissions: Array.from(mergedSubmissions.values()) });
                        }
                    } else if (mergedSubmissions.size === 0) {
                        // Ensure state is set even if empty
                        set({ monthlyReportSubmissions: [] });
                    }
                } catch (error) {
                    console.error("❌ [loadMonthlyReportSubmissions] Failed:", error);
                }
            },

            loadTeamReadingHistory: async () => {
                try {
                    const { getReadingHistoryByEmployeeIds, getQuranReadingHistoryByEmployeeIds } = await import('@/services/readingHistoryService');
                    const { getManagedEmployeeIds } = await import('@/services/employeeService');
                    const { getEmployeeQuranCompetency, getEmployeeQuranHistory } = await import('@/services/quranCompetencyService');
                    const loggedInEmployee = useAuthStore.getState().loggedInEmployee;

                    if (!loggedInEmployee) return;

                    const menteeIds = await getManagedEmployeeIds(loggedInEmployee.id);
                    if (menteeIds.length === 0) return;

                    // Fetch everything in parallel
                    const [bookHistory, quranHistory, ...competencyResults] = await Promise.all([
                        getReadingHistoryByEmployeeIds(menteeIds),
                        getQuranReadingHistoryByEmployeeIds(menteeIds),
                        ...menteeIds.map(id => getEmployeeQuranCompetency(id)),
                        ...menteeIds.map(id => getEmployeeQuranHistory(id))
                    ]);

                    // Split competencyResults back into competency and history
                    const competencyData = competencyResults.slice(0, menteeIds.length);
                    const historicalData = competencyResults.slice(menteeIds.length);

                    // Update EmployeeStore's allUsersData in bulk
                    const { useEmployeeStore } = await import('./employeeStore');
                    const employeeStore = useEmployeeStore.getState();
                    const nextAllUsersData = { ...employeeStore.allUsersData };

                    // 🔥 OPTIMIZED MAPPING: Group histories by ID once
                    const bookHistoryMap = new Map<string, unknown[]>();
                    const quranHistoryMap = new Map<string, unknown[]>();

                    bookHistory.forEach(h => {
                        if (!bookHistoryMap.has(h.userId)) bookHistoryMap.set(h.userId, []);
                        bookHistoryMap.get(h.userId)!.push(h);
                    });

                    quranHistory.forEach((h: Record<string, unknown>) => {
                        const uid = (h.employee_id as string) || (h.userId as string) || (h.employeeId as string);
                        if (!uid) return;
                        if (!quranHistoryMap.has(uid)) quranHistoryMap.set(uid, []);
                        quranHistoryMap.get(uid)!.push({
                            ...h,
                            userId: uid // Normalize
                        });
                    });

                    menteeIds.forEach((id, index) => {
                        if (nextAllUsersData[id]) {
                            const employee = nextAllUsersData[id].employee;
                            nextAllUsersData[id] = {
                                ...nextAllUsersData[id],
                                employee: {
                                    ...employee,
                                    readingHistory: (bookHistoryMap.get(id) || []) as any[],
                                    quranReadingHistory: (quranHistoryMap.get(id) || []) as any[],
                                    quranCompetency: competencyData[index] as any,
                                    quranHistory: historicalData[index] as any[]
                                }
                            };
                        }
                    });

                    employeeStore.setAllUsersData(() => nextAllUsersData);
                } catch (error) {
                    console.error("❌ [loadTeamReadingHistory] Failed:", error);
                }
            },

            addOrUpdateTadarusRequest: async (request) => {
                try {
                    // Save to Database first
                    const { createTadarusRequest, updateTadarusRequest } = await import('@/services/tadarusService');

                    const existingRequest = get().tadarusRequests.find((r: TadarusRequest) => r.id === request.id);

                    if (!existingRequest) {
                        // Create new request
                        await createTadarusRequest(request);
                    } else if (existingRequest.status !== request.status) {
                        // Update status only
                        await updateTadarusRequest(request.id, {
                            status: request.status,
                            reviewedAt: request.reviewedAt
                        });
                    }

                    // Then update local state
                    set((state) => {
                        const index = state.tadarusRequests.findIndex(r => r.id === request.id);
                        if (index !== -1) {
                            const newRequests = [...state.tadarusRequests];
                            newRequests[index] = request;
                            return { tadarusRequests: newRequests };
                        }
                        return { tadarusRequests: [...state.tadarusRequests, request] };
                    });
                } catch (error) {
                    throw error;
                }
            },

            addOrUpdateMissedPrayerRequest: async (request) => {
                try {
                    const { createMissedPrayerRequest, updateMissedPrayerRequest } = await import('@/services/prayerRequestService');

                    const existingRequest = get().missedPrayerRequests.find((r: MissedPrayerRequest) => r.id === request.id);

                    if (!existingRequest) {
                        await createMissedPrayerRequest(request);
                    } else if (existingRequest.status !== request.status || existingRequest.mentorNotes !== request.mentorNotes) {
                        await updateMissedPrayerRequest(request.id, {
                            status: request.status,
                            reviewedAt: request.reviewedAt,
                            mentorNotes: request.mentorNotes
                        });
                    }

                    set((state) => {
                        const index = state.missedPrayerRequests.findIndex(r => r.id === request.id);
                        if (index !== -1) {
                            const newRequests = [...state.missedPrayerRequests];
                            newRequests[index] = request;
                            return { missedPrayerRequests: newRequests };
                        }
                        return { missedPrayerRequests: [...state.missedPrayerRequests, request] };
                    });
                } catch (error) {
                    throw error;
                }
            },

            addMenteeTarget: (target) => set((state) => ({
                menteeTargets: [...state.menteeTargets, target]
            })),

            updateMenteeTarget: (targetId, updates) => set((state) => ({
                menteeTargets: state.menteeTargets.map(t => t.id === targetId ? { ...t, ...updates } : t)
            })),

            deleteMenteeTarget: (targetId) => set((state) => ({
                menteeTargets: state.menteeTargets.filter(t => t.id !== targetId)
            })),
        }),
        {
            name: 'guidance-storage',
        }
    )
);
