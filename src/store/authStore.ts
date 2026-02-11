
import { create } from 'zustand';
import { type Employee } from '@/types';
import { timeValidationService } from '@/services/timeValidationService';
import { useEmployeeStore } from './employeeStore';

interface AuthState {
    loggedInEmployee: Employee | null;
    isHydrated: boolean;
    isLoggingOut: boolean;
    setLoggedInEmployee: (employee: Employee | null) => void;
    setIsLoggingOut: (isLoggingOut: boolean) => void;
    setHydrated: (isHydrated: boolean) => void;
    loadLoggedInEmployee: () => Promise<void>;
    logoutEmployee: (router?: { push: (href: string) => void }) => void;
    markAnnouncementAsRead: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    loggedInEmployee: null,
    isHydrated: false,
    isLoggingOut: false,

    setLoggedInEmployee: (employee) => set({ loggedInEmployee: employee, isLoggingOut: false }),
    setIsLoggingOut: (isLoggingOut) => set({ isLoggingOut }),
    setHydrated: (isHydrated) => set({ isHydrated }),

    loadLoggedInEmployee: async () => {
        // Don't load if we're in the middle of logging out
        if (get().isLoggingOut) {
            return;
        }

        try {
            // Non-blocking time sync to speed up login
            timeValidationService.syncWithServerTime().catch(console.error);

            const response = await fetch('/api/auth/me', {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                const employee = data.employee;

                if (employee) {
                    // Double-check we're not logging out
                    if (get().isLoggingOut) return;

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('loggedInUserId', employee.id);
                    }

                    set({
                        loggedInEmployee: employee,
                        isHydrated: true
                    });

                    // Sync with useEmployeeStore
                    const employeeStore = useEmployeeStore.getState();
                    employeeStore.setAllUsersData(prev => ({
                        ...prev,
                        [employee.id]: {
                            employee,
                            attendance: prev[employee.id]?.attendance || {},
                            history: prev[employee.id]?.history || {}
                        }
                    }));

                    // Load detailed data via employee store
                    employeeStore.loadDetailedEmployeeData(employee.id).catch(err => {
                        console.error('⚠️ [AuthStore] Failed to pre-load detailed data:', err);
                    });

                    const hasManagementRole =
                        employee.role === 'admin' ||
                        employee.role === 'super-admin' ||
                        employee.canBeMentor ||
                        employee.canBeSupervisor ||
                        employee.canBeKaUnit ||
                        employee.canBeDirut;

                    if (hasManagementRole && !get().isLoggingOut) {
                        setTimeout(() => {
                            // Final check before loading
                            if (get().isLoggingOut) return;
                            employeeStore.loadPaginatedEmployees(1, 15).catch(err => console.error('Failed to load paginated employees:', err));
                            employeeStore.loadAllEmployees().catch(err => console.error('Failed to load basic employee info:', err));
                        }, 100);
                    }

                } else {
                    throw new Error('No employee data in response');
                }
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('loggedInUserId');
                    set({ loggedInEmployee: null, isHydrated: true });
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login' && currentPath !== '/login/') {
                        window.location.href = '/login';
                    }
                }
            }
        } catch (error) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('loggedInUserId');
                set({ loggedInEmployee: null, isHydrated: true });
                window.location.href = '/login';
            }
        }
    },

    logoutEmployee: async (router?: { push: (href: string) => void }) => {
        if (get().isLoggingOut) return;
        set({ isLoggingOut: true });

        try {
            // Clear local storage and cookies immediately
            if (typeof window !== 'undefined') {
                localStorage.removeItem('loggedInUserId');
                localStorage.removeItem('lastVisitedPage');
                document.cookie = 'session=; path=/; max-age=0; SameSite=Lax';
                document.cookie = 'loggedInUserId=; path=/; max-age=0; SameSite=Lax';
            }

            // Clear auth state immediately
            set({
                loggedInEmployee: null,
                isHydrated: true,
                isLoggingOut: true
            });

            // Clear employee store immediately
            const employeeStore = useEmployeeStore.getState();
            employeeStore.setAllUsersData(() => ({}));

            // Redirect to logout API to clear cookies server-side and then redirect to login
            // Use fetch to avoid full page reload loop
            if (typeof window !== 'undefined') {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
            }

        } catch (e) {
            console.error('Logout process error:', e);
            // Still redirect even if there's an error
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    },

    markAnnouncementAsRead: async () => {
        const { loggedInEmployee } = get();
        if (!loggedInEmployee) return;

        const now = timeValidationService.getCorrectedTime().getTime();
        const updatedEmployee = { ...loggedInEmployee, lastAnnouncementReadTimestamp: now };

        set({ loggedInEmployee: updatedEmployee });

        // Update in employeeStore too
        const employeeStore = useEmployeeStore.getState();
        employeeStore.setAllUsersData(prev => ({
            ...prev,
            [loggedInEmployee.id]: {
                ...prev[loggedInEmployee.id],
                employee: updatedEmployee
            }
        }));

        try {
            const { updateEmployee } = await import('@/services/employeeService');
            await updateEmployee(loggedInEmployee.id, { lastAnnouncementReadTimestamp: now });
        } catch (error) {
            console.error('❌ [markAnnouncementAsRead] Error persisting to Database:', error);
        }
    },
}));
