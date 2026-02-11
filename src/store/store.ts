
import { useAuthStore } from './authStore';
import { useEmployeeStore } from './employeeStore';
import { useHospitalStore } from './hospitalStore';

// Re-export everything for convenience
export * from './uiStore';
export * from './authStore';
export * from './employeeStore';
export * from './hospitalStore';
export * from './activityStore';
export * from './announcementStore';
export * from './bookmarkStore';
export * from './dailyActivitiesStore';
export * from './guidanceStore';
export * from './mutabaahStore';
export * from './notificationStore';
export * from './sunnahIbadahStore';

/**
 * ⚠️ DEPRECATED: useAppDataStore is being split into specific stores.
 * Please use useAuthStore, useEmployeeStore, or useHospitalStore instead.
 * 
 * This shim is provided to maintain backward compatibility during refactoring.
 */
export const useAppDataStore = () => {
    const auth = useAuthStore();
    const employee = useEmployeeStore();
    const hospital = useHospitalStore();

    return {
        ...auth,
        ...employee,
        ...hospital,
    } as any;
};
