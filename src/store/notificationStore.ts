import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types';
import {
    getUserNotifications,
} from '@/services/notificationService';

// Note: notificationService itself likely needs refactoring, but for now we safeguard the store
// to catch errors if those services fail due to missing local DB connection.

interface NotificationState {
    notifications: Notification[];
    isHydrated: boolean;
    hydrate: (userId: string) => Promise<void>;
    createNotification: (data: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: (userId: string) => Promise<void>;
    clearAll: (userId: string) => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
    deleteNotifications: (notificationIds: string[]) => Promise<void>;
    subscribeToRealtime: (userId: string) => (() => void);
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            notifications: [],
            isHydrated: false,

            hydrate: async (userId: string) => {
                try {
                    // Try to fetch, but handle failure gracefully
                    // If getUserNotifications throws (because of DB issues), we catch it.
                    // Ideally getUserNotifications should be migrated to /api/notifications
                    let notifications: Notification[] = [];
                    try {
                        const res = await fetch(`/api/notifications?userId=${userId}`);
                        if (res.ok) {
                            const data = await res.json();
                            notifications = data.notifications || [];
                        }
                    } catch (e) {
                        // Fallback or ignore
                    }

                    set({
                        notifications: notifications,
                        isHydrated: true
                    });

                } catch (error) {
                    set({ isHydrated: true });
                }
            },

            createNotification: async (data) => {
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const newNotification: Notification = {
                    ...data,
                    id: tempId,
                    timestamp: Date.now(),
                    isRead: false,
                };

                set((state) => ({ notifications: [newNotification, ...state.notifications] }));

                // Sync to API?
                // For now, local only or dummy sync.
            },

            markAsRead: async (notificationId) => {
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    );
                    return { notifications: updated };
                });

                try {
                    await fetch('/api/notifications', {
                        method: 'PATCH',
                        body: JSON.stringify({ action: 'markAsRead', notificationIds: [notificationId] })
                    });
                } catch (e) { }
            },

            markAllAsRead: async (userId) => {
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.userId === userId ? { ...n, isRead: true } : n
                    );
                    return { notifications: updated };
                });
            },

            clearAll: async (userId) => {
                set((state) => {
                    const filtered = state.notifications.filter(n => n.userId !== userId);
                    return { notifications: filtered };
                });
            },

            dismissNotification: async (notificationId) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== notificationId)
                }));
            },

            deleteNotifications: async (notificationIds) => {
                set((state) => {
                    const filtered = state.notifications.filter(n => !notificationIds.includes(n.id));
                    return { notifications: filtered };
                });
            },

            subscribeToRealtime: (userId: string) => {
                // Disabled Realtime for local mode
                return () => { };
            },
        }),
        {
            name: 'notifications-storage',
            version: 1,
            merge: (persistedState: unknown, currentState: NotificationState) => {
                const persisted = persistedState as Partial<NotificationState>;
                return {
                    ...currentState,
                    notifications: persisted?.notifications || []
                };
            },
            migrate: (persistedState: unknown, version: number) => {
                return {
                    isHydrated: false,
                    notifications: []
                } as any as NotificationState;
            },
        }
    )
);
