import type { Notification } from '@/types';

interface DbNotification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    timestamp?: number;
    createdAt?: string;
    isRead: boolean;
    relatedEntityId?: string;
    linkTo?: any;
    expiresAt?: number;
    dismissOnClick?: boolean;
}

/**
 * Get all notifications for a specific user via API
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
    try {
        const response = await fetch(`/api/notifications?userId=${userId}`);
        if (!response.ok) return [];
        const { data } = await response.json();

        return (data || []).map((row: DbNotification) => ({
            id: row.id,
            userId: row.userId,
            type: row.type,
            title: row.title,
            message: row.message,
            timestamp: row.timestamp || (row.createdAt ? new Date(row.createdAt).getTime() : Date.now()),
            isRead: row.isRead,
            relatedEntityId: row.relatedEntityId,
            linkTo: row.linkTo,
            expiresAt: row.expiresAt,
            dismissOnClick: row.dismissOnClick ?? true,
        }));
    } catch (error) {
        console.error('getUserNotifications error:', error);
        return [];
    }
}

/**
 * Mark notification as read via API
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notificationId, userId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to mark notification as read');
        }
    } catch (err) {
        console.error('❌ [markNotificationAsRead] Error:', err);
        throw err;
    }
}

/**
 * Mark all notifications for a user as read via API
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_all_read', userId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to mark all notifications as read');
        }
    } catch (err) {
        console.error('markAllNotificationsAsRead error:', err);
        throw err;
    }
}

/**
 * Delete notifications via API
 */
export async function deleteNotifications(notificationIds: string[]): Promise<void> {
    try {
        const response = await fetch(`/api/notifications?ids=${encodeURIComponent(notificationIds.join(','))}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete notifications');
        }
    } catch (err) {
        console.error('deleteNotifications error:', err);
        throw err;
    }
}

/**
 * Clear all notifications for a user via API
 */
export async function clearAllNotifications(userId: string): Promise<void> {
    try {
        const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to clear notifications');
        }
    } catch (err) {
        console.error('clearAllNotifications error:', err);
        throw err;
    }
}

/**
 * Create a new notification (Server-side/Internal use mostly)
 * In local DB, this should be handled by the API that triggers the notification
 */
export async function createNotification(notification: Notification): Promise<Notification> {
    // Implement internal POST if needed, but usually notifications are created by server-side logic
    console.warn('createNotification called on client. This should be handled by server-side APIs.');
    return notification;
}

/**
 * Subscribe to notifications (Realtime disabled in local mode)
 */
export function subscribeToUserNotifications(
    _userId: string,
    _callback: (notification: Notification) => void
) {
    console.warn('Realtime notifications are disabled in local mode.');
    return {
        unsubscribe: () => { }
    };
}