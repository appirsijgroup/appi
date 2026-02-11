
import { create } from 'zustand';
import { type Employee, Attendance, ReadingHistory, QuranReadingHistory, EmployeeQuranCompetency, EmployeeQuranHistory, TeamAttendanceRecord } from '@/types';
import { timeValidationService } from '@/services/timeValidationService';
import { useAuthStore } from './authStore';

type UserData = { employee: Employee; attendance: Attendance; history: Record<string, Attendance> };

interface AttendanceRecord {
    employee_id: string;
    entity_id: string;
    status: string;
    reason?: string;
    timestamp: string | number;
    is_late_entry?: boolean;
}

interface ActivityAttendanceRecord {
    employee_id: string;
    activity_id: string;
    status: string;
    timestamp: string | number;
    submitted_at?: string | number;
}

interface EmployeeState {
    allUsersData: Record<string, UserData>;
    isLoadingEmployees: boolean;
    activityStatsRefreshCounter: number;
    lastDetailedLoad: Record<string, number>;
    lastAllEmployeesLoad: number;
    lastHeavyAdminLoad: number;
    paginatedEmployees: Employee[];
    paginationInfo: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } | null;

    setAllUsersData: (fn: (state: EmployeeState['allUsersData']) => EmployeeState['allUsersData']) => void;
    loadAllEmployees: (limit?: number) => Promise<void>;
    loadPaginatedEmployees: (page?: number, limit?: number, search?: string, role?: string, isActive?: boolean, hospitalId?: string, isAppend?: boolean) => Promise<void>;
    refreshActivityStats: () => void;
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    loadTeamProgressBulk: (month?: number, year?: number) => Promise<void>;
    loadHeavyAdminData: (customStartDate?: string) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
    allUsersData: {},
    isLoadingEmployees: false,
    activityStatsRefreshCounter: 0,
    lastDetailedLoad: {},
    lastAllEmployeesLoad: 0,
    lastHeavyAdminLoad: 0,
    paginatedEmployees: [],
    paginationInfo: null,

    setAllUsersData: (fn) => set(state => ({ allUsersData: fn(state.allUsersData) })),
    refreshActivityStats: () => set((state) => ({ activityStatsRefreshCounter: state.activityStatsRefreshCounter + 1 })),

    loadAllEmployees: async (limit?: number) => {
        // Check if user is logging out (fast check)
        if (useAuthStore.getState().isLoggingOut) {
            return;
        }

        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000;

        if (get().isLoadingEmployees && limit) return;

        const isFullLoad = !limit;
        if (isFullLoad && now - get().lastAllEmployeesLoad < CACHE_DURATION && Object.keys(get().allUsersData).length > 50) {
            return;
        }

        try {
            set({ isLoadingEmployees: true });
            const { getAllEmployees } = await import('@/services/employeeService');
            const allEmployees = await getAllEmployees(limit);

            const initialData: Record<string, UserData> = {};
            allEmployees.forEach(emp => {
                const existingUser = get().allUsersData[emp.id];
                const existingActivities = existingUser?.employee?.monthlyActivities;

                // Preserve monthlyActivities if the new one is empty but we have existing data
                // This is crucial because getAllEmployees intentionally returns empty monthlyActivities for performance
                const mergedEmployee = {
                    ...emp,
                    monthlyActivities: (existingActivities && Object.keys(existingActivities).length > 0)
                        ? existingActivities
                        : (emp.monthlyActivities || {}),
                    // Preserve detailed arrays not returned by the list API
                    readingHistory: existingUser?.employee?.readingHistory || emp.readingHistory,
                    quranReadingHistory: existingUser?.employee?.quranReadingHistory || emp.quranReadingHistory,
                    quranCompetency: existingUser?.employee?.quranCompetency || emp.quranCompetency,
                    quranHistory: existingUser?.employee?.quranHistory || emp.quranHistory
                };

                initialData[emp.id] = {
                    employee: mergedEmployee,
                    attendance: existingUser?.attendance || {},
                    history: existingUser?.history || {}
                };
            });

            set(state => ({
                allUsersData: { ...state.allUsersData, ...initialData },
                isLoadingEmployees: false,
                lastAllEmployeesLoad: !limit ? now : state.lastAllEmployeesLoad
            }));
        } catch (error) {
            // Silently fail if we're logging out
            if (useAuthStore.getState().isLoggingOut) {
                set({ isLoadingEmployees: false });
                return;
            }
            console.error('❌ [loadAllEmployees] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },

    loadHeavyAdminData: async (customStartDate?: string) => {
        if (get().isLoadingEmployees) return;
        try {
            set({ isLoadingEmployees: true });

            const now = new Date();
            let currentYear = now.getFullYear();
            let currentMonth = now.getMonth() + 1;
            let startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

            if (customStartDate) {
                startOfMonth = customStartDate;
                const d = new Date(customStartDate);
                if (!isNaN(d.getTime())) {
                    currentYear = d.getFullYear();
                    currentMonth = d.getMonth() + 1;
                }
            }

            const [reportRes, bulkActivitiesRes] = await Promise.all([
                fetch(`/api/admin/reports/full-sync?startDate=${startOfMonth}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { data: {} }),
                fetch(`/api/admin/bulk-monthly-activities?month=${currentMonth}&year=${currentYear}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { allActivities: {} })
            ]);

            const reportData = reportRes.data || {};
            const allMonthlyActivities = bulkActivitiesRes.allActivities || {};

            const attendanceRecords = (reportData.attendanceRecords as AttendanceRecord[]) || [];
            const teamRecords = (reportData.teamAttendanceRecords as TeamAttendanceRecord[]) || [];
            const activityRecords = (reportData.activityAttendanceRecords as ActivityAttendanceRecord[]) || [];
            const employeesFromBypass = (reportData.employees as Employee[]) || [];

            const todayStr = new Date().toISOString().split('T')[0];
            const updatedUsers: Record<string, { attendance: Attendance; history: Record<string, Attendance> }> = {};

            const mergeToUpdate = (userId: string, entityId: string, data: Record<string, unknown>, explicitDateStr?: string) => {
                if (!userId) return;
                if (!updatedUsers[userId]) {
                    updatedUsers[userId] = { attendance: {}, history: {} };
                }
                const dateStr = explicitDateStr || new Date((data as any).timestamp).toISOString().split('T')[0];
                if (dateStr === todayStr) {
                    updatedUsers[userId].attendance[entityId] = data as any;
                } else {
                    if (!updatedUsers[userId].history[dateStr]) updatedUsers[userId].history[dateStr] = {};
                    updatedUsers[userId].history[dateStr][entityId] = data as any;
                }
            };

            const { convertToCamelCase } = await import('@/services/employeeService');
            const nextAllUsersData = { ...get().allUsersData };

            employeesFromBypass.forEach((empRaw: unknown) => {
                const emp = convertToCamelCase(empRaw as any) as Employee;
                if (emp.id) {
                    if (allMonthlyActivities[emp.id]) emp.monthlyActivities = allMonthlyActivities[emp.id];
                    if (!nextAllUsersData[emp.id]) {
                        nextAllUsersData[emp.id] = { employee: emp, attendance: {}, history: {} };
                    } else {
                        const existing = nextAllUsersData[emp.id].employee;
                        nextAllUsersData[emp.id] = {
                            ...nextAllUsersData[emp.id],
                            employee: {
                                ...emp,
                                monthlyActivities: (existing?.monthlyActivities && Object.keys(existing.monthlyActivities).length > 0)
                                    ? existing.monthlyActivities
                                    : (emp.monthlyActivities || nextAllUsersData[emp.id].employee.monthlyActivities),
                                // Preserve detailed arrays not returned by high-level sync
                                readingHistory: existing?.readingHistory || emp.readingHistory,
                                quranReadingHistory: existing?.quranReadingHistory || emp.quranReadingHistory,
                                quranCompetency: existing?.quranCompetency || emp.quranCompetency,
                                quranHistory: existing?.quranHistory || emp.quranHistory
                            }
                        };
                    }
                }
            });

            attendanceRecords.forEach((record) => {
                if (record && record.status) {
                    mergeToUpdate(record.employee_id, record.entity_id, {
                        status: record.status,
                        reason: record.reason || null,
                        timestamp: new Date(record.timestamp).getTime(),
                        submitted: true,
                        isLateEntry: record.is_late_entry || false
                    });
                }
            });

            teamRecords.forEach(r => {
                const rAny = r as unknown as Record<string, unknown>;
                const uid = (rAny.user_id as string) || (rAny.userId as string) || r.id;
                if (!uid) return;
                const sessionDate = r.sessionDate || (rAny.session_date as string);
                if (!sessionDate) return;
                mergeToUpdate(uid, r.sessionType || (rAny.session_type as string) || 'Kegiatan Tim', {
                    status: 'hadir',
                    timestamp: new Date(r.attendedAt || (rAny.attended_at as string)).getTime(),
                    submitted: true
                }, sessionDate);
            });

            activityRecords.forEach(r => {
                if (!r.employee_id) return;
                const activityDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : null;
                mergeToUpdate(r.employee_id, r.activity_id, {
                    status: r.status,
                    timestamp: new Date(r.submitted_at || r.timestamp).getTime(),
                    submitted: true
                }, activityDate || undefined);
            });

            Object.entries(updatedUsers).forEach(([userId, updates]) => {
                if (nextAllUsersData[userId]) {
                    const nextAttendance = { ...(nextAllUsersData[userId].attendance || {}), ...updates.attendance };
                    const nextHistory = { ...(nextAllUsersData[userId].history || {}) };
                    Object.entries(updates.history).forEach(([date, dayRecords]) => {
                        nextHistory[date] = { ...(nextHistory[date] || {}), ...dayRecords };
                    });

                    nextAllUsersData[userId] = { ...nextAllUsersData[userId], attendance: nextAttendance, history: nextHistory };
                }
            });

            set({ allUsersData: nextAllUsersData, isLoadingEmployees: false, lastHeavyAdminLoad: Date.now() });
        } catch (e) {
            console.error('⚠️ [loadHeavyAdminData] Failed:', e);
            set({ isLoadingEmployees: false });
        }
    },

    loadPaginatedEmployees: async (page = 1, limit = 15, search = '', role = '', isActive, hospitalId = '', isAppend = false) => {
        if (get().isLoadingEmployees && !isAppend) return;

        try {
            set({ isLoadingEmployees: true });
            const { getPaginatedEmployees } = await import('@/services/employeeServicePaginated');
            const { employees, pagination } = await getPaginatedEmployees({ page, limit, search, role, isActive, hospitalId });

            const newUsersToMerge: Record<string, UserData> = {};
            employees.forEach(emp => {
                if (!get().allUsersData[emp.id]) {
                    newUsersToMerge[emp.id] = { employee: emp, attendance: {}, history: {} };
                } else {
                    const existing = get().allUsersData[emp.id];
                    newUsersToMerge[emp.id] = {
                        ...existing,
                        employee: {
                            ...emp,
                            monthlyActivities: (existing.employee?.monthlyActivities && Object.keys(existing.employee.monthlyActivities).length > 0)
                                ? existing.employee.monthlyActivities
                                : (emp.monthlyActivities || {}),
                            // Preserve detailed arrays not returned by the list API
                            readingHistory: existing.employee?.readingHistory || emp.readingHistory,
                            quranReadingHistory: existing.employee?.quranReadingHistory || emp.quranReadingHistory,
                            quranCompetency: existing.employee?.quranCompetency || emp.quranCompetency,
                            quranHistory: existing.employee?.quranHistory || emp.quranHistory
                        }
                    };
                }
            });

            set(state => ({
                allUsersData: { ...state.allUsersData, ...newUsersToMerge },
                paginatedEmployees: isAppend ? [...state.paginatedEmployees, ...employees] : employees,
                paginationInfo: pagination,
                isLoadingEmployees: false
            }));
        } catch (error) {
            console.error('❌ [loadPaginatedEmployees] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },

    loadDetailedEmployeeData: async (employeeId: string, monthOrForce?: number | boolean, yearParam?: number, forceParam = false) => {
        if (!employeeId) return;

        let month: number | undefined = undefined;
        const year: number | undefined = yearParam;
        let force: boolean = forceParam;

        if (typeof monthOrForce === 'boolean') {
            force = monthOrForce;
        } else {
            month = monthOrForce;
        }

        const now = Date.now();
        const cacheKey = `${employeeId}-${month || 'all'}-${year || 'all'}`;
        const lastLoad = get().lastDetailedLoad[cacheKey] || 0;
        if (!force && now - lastLoad < 30000) return;

        try {
            // Lazy load services
            const [
                { getMonthlyActivities },
                { getReadingHistory, getQuranReadingHistory },
                { getEmployeeById },
                { getEmployeeQuranCompetency, getEmployeeQuranHistory },
                { convertMonthlyReportsToActivities }
            ] = await Promise.all([
                import('@/services/monthlyActivityService'),
                import('@/services/readingHistoryService'),
                import('@/services/employeeService'),
                import('@/services/quranCompetencyService'),
                import('@/services/monthlyReportService')
            ]);

            const needsBasicInfo = !get().allUsersData[employeeId];

            const [mergedActivities, readingHistory, quranReadingHistory, basicInfo, quranCompetency, quranHistory, manualReportsActivities] = await Promise.all([
                getMonthlyActivities(employeeId, month, year),
                getReadingHistory(employeeId),
                getQuranReadingHistory(employeeId),
                needsBasicInfo ? getEmployeeById(employeeId) : Promise.resolve(null),
                getEmployeeQuranCompetency(employeeId),
                getEmployeeQuranHistory(employeeId),
                convertMonthlyReportsToActivities(employeeId)
            ]);

            set(state => {
                const newData = { ...state.allUsersData };
                const baseEmployee = newData[employeeId]?.employee || basicInfo;

                if (baseEmployee) {
                    let updatedActivities = { ...mergedActivities };

                    // Merging logic for manual reports
                    if (manualReportsActivities) {
                        Object.entries(manualReportsActivities as Record<string, Record<string, Record<string, boolean>>>).forEach(([mKey, days]) => {
                            if (!updatedActivities[mKey]) updatedActivities[mKey] = {};
                            Object.entries(days).forEach(([dKey, acts]) => {
                                if (!updatedActivities[mKey][dKey]) updatedActivities[mKey][dKey] = {};
                                Object.assign(updatedActivities[mKey][dKey], acts);
                            });
                        });
                    }

                    if (month && year) {
                        updatedActivities = {
                            ...(baseEmployee.monthlyActivities || {}),
                            ...updatedActivities
                        };
                    }

                    newData[employeeId] = {
                        ...newData[employeeId],
                        employee: {
                            ...baseEmployee,
                            monthlyActivities: updatedActivities,
                            readingHistory: readingHistory as ReadingHistory[],
                            quranReadingHistory: quranReadingHistory as QuranReadingHistory[],
                            quranCompetency: quranCompetency as EmployeeQuranCompetency,
                            quranHistory: quranHistory as EmployeeQuranHistory[],
                        }
                    };
                }

                return {
                    allUsersData: newData,
                    lastDetailedLoad: { ...state.lastDetailedLoad, [cacheKey]: now }
                };
            });

        } catch (error) {
            console.error('❌ [loadDetailedEmployeeData] ErrorAggregate:', error);
        }
    },

    loadTeamProgressBulk: async (monthParam?: number, yearParam?: number) => {
        if (get().isLoadingEmployees) return;

        try {
            set({ isLoadingEmployees: true });
            const now = new Date();
            const month = monthParam || (now.getMonth() + 1);
            const year = yearParam || now.getFullYear();

            const response = await fetch(`/api/admin/bulk-monthly-activities?month=${month}&year=${year}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Bulk fetch failed');

            const { allActivities } = await response.json();

            set(state => {
                const nextAllUsersData = { ...state.allUsersData };

                Object.entries(allActivities as Record<string, Record<string, Record<string, Record<string, boolean>>>>).forEach(([empId, activities]) => {
                    if (nextAllUsersData[empId]) {
                        nextAllUsersData[empId] = {
                            ...nextAllUsersData[empId],
                            employee: {
                                ...nextAllUsersData[empId].employee,
                                monthlyActivities: {
                                    ...(nextAllUsersData[empId].employee.monthlyActivities || {}),
                                    ...activities
                                }
                            }
                        };
                    }
                });

                return {
                    allUsersData: nextAllUsersData,
                    isLoadingEmployees: false
                };
            });

        } catch (error) {
            console.error('❌ [loadTeamProgressBulk] Error:', error);
            set({ isLoadingEmployees: false });
        }
    },
}));
