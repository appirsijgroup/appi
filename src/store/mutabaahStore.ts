import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MutabaahLockingMode, Employee, MonthlyActivityProgress, MonthlyReportSubmission } from '@/types';
import { getAppSetting } from '@/services/appSettingsService';
import {
    activateMonth as activateMonthService,
    updateMonthlyProgress as updateMonthlyProgressService
} from '@/services/monthlyActivityService';

import { useAuthStore } from './authStore';
import { useEmployeeStore } from './employeeStore';

export interface MutabaahState {
    mutabaahLockingMode: MutabaahLockingMode;
    isCurrentMonthActivated: boolean;
    activatedMonths: string[];
    monthlyProgressData: Record<string, MonthlyActivityProgress>;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    isLoading: boolean;
    error: string | null;

    setMutabaahLockingMode: (mode: MutabaahLockingMode, isSuperAdmin?: boolean, userId?: string) => Promise<void>;
    load: () => Promise<void>; // Renamed for clarity
    subscribeToRealtime: () => () => void; // Returns dummy unsubscribe function

    initializeFromEmployee: (employee: Employee | null) => Promise<void>;
    refreshData: () => Promise<void>;
    activateMonth: (monthKey: string) => Promise<boolean>;
    updateMonthlyProgress: (monthKey: string, progress: MonthlyActivityProgress) => Promise<boolean>;
    checkCurrentMonthActivation: () => void;
    setMonthlyReportSubmissions: (submissions: MonthlyReportSubmission[]) => void;
}

export const useMutabaahStore = create<MutabaahState>()(
    persist(
        (set, get) => ({
            mutabaahLockingMode: 'monthly',
            isCurrentMonthActivated: false,
            activatedMonths: [],
            monthlyProgressData: {},
            monthlyReportSubmissions: [],
            isLoading: false,
            error: null,

            load: async () => {
                // Fetch settings from local API if available, or default
                set({ mutabaahLockingMode: 'monthly' });
            },

            subscribeToRealtime: () => {
                // Realtime disabled for local DB migration
                return () => { };
            },

            setMutabaahLockingMode: async (mode, isSuperAdmin = false, userId) => {
                set({ mutabaahLockingMode: mode });
                // Logic to update settings via API if developed
            },

            initializeFromEmployee: async (employee: Employee | null) => {
                if (!employee || !employee.id) {
                    set({
                        isCurrentMonthActivated: false,
                        activatedMonths: [],
                        monthlyProgressData: {},
                        error: null
                    });
                    return;
                }

                const months = employee.activatedMonths || (employee as any).activated_months as string[] || [];
                const activities = employee.monthlyActivities || (employee as any).monthly_activities as Record<string, MonthlyActivityProgress> || {};

                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isActivated = months.includes(currentMonthKey);

                set({
                    activatedMonths: months,
                    monthlyProgressData: activities,
                    isCurrentMonthActivated: isActivated,
                    error: null
                });
            },

            checkCurrentMonthActivation: () => {
                const { activatedMonths } = get();
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isActivated = activatedMonths.includes(currentMonthKey);

                if (isActivated !== get().isCurrentMonthActivated) {
                    set({ isCurrentMonthActivated: isActivated });
                }
            },

            activateMonth: async (monthKey: string) => {
                const { loggedInEmployee } = useAuthStore.getState();

                if (!loggedInEmployee?.id) {
                    set({ error: 'User not logged in' });
                    return false;
                }

                const { activatedMonths } = get();
                if (activatedMonths.includes(monthKey)) return true;

                try {
                    const success = await activateMonthService(loggedInEmployee.id, monthKey);

                    if (success) {
                        const newActivatedMonths = [...activatedMonths, monthKey];
                        const now = new Date();
                        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        const isCurrentActivated = monthKey === currentMonthKey;

                        set(state => ({
                            activatedMonths: newActivatedMonths,
                            isCurrentMonthActivated: isCurrentActivated ? true : state.isCurrentMonthActivated,
                            error: null
                        }));

                        const authStore = useAuthStore.getState();
                        const employeeStore = useEmployeeStore.getState();

                        if (!authStore.loggedInEmployee || authStore.loggedInEmployee.id !== loggedInEmployee.id) return true;

                        // Update auth store
                        authStore.setLoggedInEmployee({
                            ...authStore.loggedInEmployee,
                            activatedMonths: newActivatedMonths
                        });

                        // Update employee store
                        employeeStore.setAllUsersData((prev) => ({
                            ...prev,
                            [loggedInEmployee.id]: {
                                ...prev[loggedInEmployee.id],
                                employee: {
                                    ...prev[loggedInEmployee.id].employee,
                                    activatedMonths: newActivatedMonths
                                }
                            }
                        }));
                        return true;
                    }
                    set({ error: 'Gagal mengaktifkan bulan di server' });
                    return false;
                } catch (err) {
                    set({ error: 'Terjadi kesalahan sistem saat aktivasi' });
                    return false;
                }
            },

            updateMonthlyProgress: async (monthKey: string, progress: MonthlyActivityProgress) => {
                const { loggedInEmployee } = useAuthStore.getState();
                if (!loggedInEmployee?.id) return false;

                try {
                    const success = await updateMonthlyProgressService(loggedInEmployee.id, monthKey, progress);

                    if (success) {
                        const currentData = get().monthlyProgressData;
                        const newData = { ...currentData, [monthKey]: progress };

                        set({ monthlyProgressData: newData });

                        const authStore = useAuthStore.getState();
                        const employeeStore = useEmployeeStore.getState();

                        if (!authStore.loggedInEmployee || authStore.loggedInEmployee.id !== loggedInEmployee.id) return true;

                        // Update auth store
                        authStore.setLoggedInEmployee({
                            ...authStore.loggedInEmployee,
                            monthlyActivities: newData
                        });

                        // Update employee store
                        employeeStore.setAllUsersData((prev) => ({
                            ...prev,
                            [loggedInEmployee.id]: {
                                ...prev[loggedInEmployee.id],
                                employee: {
                                    ...prev[loggedInEmployee.id].employee,
                                    monthlyActivities: newData
                                }
                            }
                        }));

                        return true;
                    }
                    set({ error: 'Gagal menyimpan progres' });
                    return false;
                } catch (err) {
                    set({ error: 'Terjadi kesalahan saat menyimpan progres' });
                    return false;
                }
            },

            refreshData: async () => {
                const { loggedInEmployee } = useAuthStore.getState();
                if (!loggedInEmployee?.id) return;

                set({ isLoading: true });

                try {
                    const currentActivities = get().monthlyProgressData || {};
                    const updatedActivities: Record<string, MonthlyActivityProgress> = { ...currentActivities };

                    // We wrap these purely to catch errors if services are missing/failing
                    try {
                        const { convertMonthlyReportsToActivities } = await import('@/services/monthlyReportService');
                        const monthlyReportsActivities = await convertMonthlyReportsToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, monthlyReportsActivities);
                    } catch (e) { }

                    try {
                        const { convertTadarusSessionsToActivities } = await import('@/services/tadarusService');
                        const tadarusActivities = await convertTadarusSessionsToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, tadarusActivities);
                    } catch (e) { }

                    try {
                        const { convertTeamAttendanceToActivities } = await import('@/services/teamAttendanceService');
                        const teamActivities = await convertTeamAttendanceToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, teamActivities);
                    } catch (e) { }

                    try {
                        const { convertScheduledActivitiesToActivities } = await import('@/services/scheduledActivityService');
                        const scheduledActivities = await convertScheduledActivitiesToActivities(loggedInEmployee.id);
                        _deepMerge(updatedActivities, scheduledActivities);
                    } catch (e) { }

                    try {
                        const { getUserMonthlyReports } = await import('@/services/monthlySubmissionService');
                        const submissions = await getUserMonthlyReports(loggedInEmployee.id);
                        // Force update to array even if empty to clear deleted records
                        set({ monthlyReportSubmissions: submissions || [] });
                    } catch (e) {
                        // If it fails, we keep what we had
                    }


                    set({ monthlyProgressData: updatedActivities, isLoading: false });

                } catch (err) {
                    set({ error: 'Gagal menyegarkan data', isLoading: false });
                }
            },

            setMonthlyReportSubmissions: (submissions) => set({ monthlyReportSubmissions: submissions })
        }),
        {
            name: 'mutabaah-storage',
            storage: createJSONStorage(() => localStorage),
            version: 3,
            migrate: (persistedState: unknown, version: number) => {
                if (version < 3) {
                    return {
                        mutabaahLockingMode: 'weekly',
                        isCurrentMonthActivated: false,
                        activatedMonths: [],
                        monthlyProgressData: {},
                        monthlyReportSubmissions: [],
                        isLoading: false,
                        error: null,
                    } as unknown as MutabaahState;
                }
                return persistedState as MutabaahState;
            },
        }
    )
);

function _deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            _deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
        } else {
            Object.assign(target, { [key]: source[key] });
        }
    });
}
