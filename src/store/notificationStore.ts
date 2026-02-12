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
                            notifications = data.data || [];
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
                try {
                    const response = await fetch('/api/notifications', {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'create',
                            ...data
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            // Map snake_case to camelCase
                            const newNotif: Notification = {
                                id: result.data.id,
                                userId: result.data.user_id,
                                type: result.data.type,
                                title: result.data.title,
                                message: result.data.message,
                                isRead: result.data.is_read,
                                timestamp: Number(result.data.timestamp),
                                linkTo: result.data.link_to,
                                relatedEntityId: result.data.related_entity_id,
                                expiresAt: result.data.expires_at ? Number(result.data.expires_at) : undefined,
                                dismissOnClick: result.data.dismiss_on_click,
                                createdAt: result.data.created_at
                            };
                            set((state) => ({ notifications: [newNotif, ...state.notifications] }));
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Failed to persist notification:', error);
                }

                // Fallback: temp local only if API fails
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const newNotification: Notification = {
                    ...data,
                    id: tempId,
                    timestamp: Date.now(),
                    isRead: false,
                };
                set((state) => ({ notifications: [newNotification, ...state.notifications] }));
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
                        method: 'POST', // API expects POST for actions
                        body: JSON.stringify({ action: 'mark_read', notificationId: notificationId })
                    });
                } catch (e) {
                    console.error('Failed to mark notification as read server-side', e);
                }
            },

            markAllAsRead: async (userId) => {
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.userId === userId ? { ...n, isRead: true } : n
                    );
                    return { notifications: updated };
                });

                try {
                    await fetch('/api/notifications', {
                        method: 'POST', // API expects POST for actions
                        body: JSON.stringify({ action: 'mark_all_read', userId: userId })
                    });
                } catch (e) {
                    console.error('Failed to mark all notifications as read server-side', e);
                }
            },

            clearAll: async (userId) => {
                set((state) => {
                    const filtered = state.notifications.filter(n => n.userId !== userId);
                    return { notifications: filtered };
                });

                try {
                    await fetch(`/api/notifications?userId=${userId}`, {
                        method: 'DELETE'
                    });
                } catch (e) {
                    console.error('Failed to clear all notifications server-side', e);
                }
            },

            dismissNotification: async (notificationId) => {
                set((state) => ({
                    notifications: state.notifications.filter(n => n.id !== notificationId)
                }));
                // Assuming dismiss also deletes or marks as read? usually dismiss = delete for transient or mark read. 
                // Based on previous user request, it seems "dismiss" might be treating it as "delete" or "read". 
                // If "dismiss" just removes from view, it might be same as delete.
                // Let's assume it deletes to be safe with "hilang sampai database".
                try {
                    await fetch(`/api/notifications?ids=${notificationId}`, {
                        method: 'DELETE'
                    });
                } catch (e) {
                    console.error('Failed to dismiss notification server-side', e);
                }
            },

            deleteNotifications: async (notificationIds) => {
                set((state) => {
                    const filtered = state.notifications.filter(n => !notificationIds.includes(n.id));
                    return { notifications: filtered };
                });

                try {
                    await fetch(`/api/notifications?ids=${notificationIds.join(',')}`, {
                        method: 'DELETE'
                    });
                } catch (e) {
                    console.error('Failed to delete notifications server-side', e);
                }
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
