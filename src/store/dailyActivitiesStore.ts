import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyActivity } from '@/types';
import { DAILY_ACTIVITIES as DEFAULT_ACTIVITIES } from '@/constants/monthlyActivities';

interface DailyActivitiesState {
    dailyActivitiesConfig: DailyActivity[];
    updateDailyActivitiesConfig: (newConfig: DailyActivity[]) => void;
}

export const useDailyActivitiesStore = create<DailyActivitiesState>()(
    persist(
        (set, get) => ({
            dailyActivitiesConfig: DEFAULT_ACTIVITIES,
            updateDailyActivitiesConfig: (newConfig) => {
                set({ dailyActivitiesConfig: newConfig });
            },
        }),
        {
            name: 'daily-activities-config-storage',
            // 🔥 MERGE logic: Ensure new activities from DEFAULT_ACTIVITIES are added to stored state
            onRehydrateStorage: (state) => {
                return (rehydratedState, error) => {
                    if (error || !rehydratedState) return;

                    let storedConfig = rehydratedState.dailyActivitiesConfig || [];

                    // 🔥 MIGRATION: Remove deprecated IDs to avoid duplicates
                    const deprecatedIds = ['5s', 'penampilan'];
                    const hasDeprecated = storedConfig.some(a => deprecatedIds.includes(a.id));

                    if (hasDeprecated) {

                        storedConfig = storedConfig.filter(a => !deprecatedIds.includes(a.id));
                    }

                    const defaultIds = DEFAULT_ACTIVITIES.map(a => a.id);
                    const storedIds = storedConfig.map(a => a.id);

                    // Add missing default activities to stored config
                    const missingActivities = DEFAULT_ACTIVITIES.filter(a => !storedIds.includes(a.id));

                    if (missingActivities.length > 0 || hasDeprecated) {

                        rehydratedState.updateDailyActivitiesConfig([...storedConfig, ...missingActivities]);
                    }
                };
            }
        }
    )
);
