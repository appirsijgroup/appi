
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
            // 1. Clear local storage immediately
            if (typeof window !== 'undefined') {
                localStorage.removeItem('loggedInUserId');
                localStorage.removeItem('lastVisitedPage');

                // 🔥 Attempt to clear non-httpOnly cookies (userId, loggedInUserId)
                // Note: 'session' cookie is httpOnly and can only be cleared by API
                document.cookie = 'loggedInUserId=; path=/; max-age=0; SameSite=Lax';
                document.cookie = 'userId=; path=/; max-age=0; SameSite=Lax';
            }

            // 2. Clear stores immediately
            set({
                loggedInEmployee: null,
                isHydrated: true,
                isLoggingOut: true
            });

            // Clear employee store immediately
            const employeeStore = useEmployeeStore.getState();
            employeeStore.setAllUsersData(() => ({}));

            // 3. Call server-side logout to clear HttpOnly session cookie
            if (typeof window !== 'undefined') {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        cache: 'no-store',
                        headers: { 'Pragma': 'no-cache' }
                    });
                } catch (fetchError) {
                    console.error('Logout API call failed:', fetchError);
                }

                // 4. Force full page reload to Login for fresh state and middleware check
                window.location.href = '/login';
            }

        } catch (e) {
            console.error('Logout process error:', e);
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
