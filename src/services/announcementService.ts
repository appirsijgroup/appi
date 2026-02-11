import { convertImageToWebP } from '@/utils/imageUtils';
import type { Announcement } from '@/types';

/**
 * Announcement Service
 * Handles all announcement-related database operations via REST API
 * MIGRATED from PostgreSQL to local PostgreSQL API
 */

// Database representation matching the snake_case schema
interface DbAnnouncement {
    id: string;
    title: string;
    content: string;
    author_id: string;
    author_name: string;
    timestamp: string | number | bigint;
    scope: 'alliansi' | 'mentor' | 'global';
    target_hospital_ids?: string[];
    target_hospital_names?: string[];
    image_url?: string;
    document_url?: string;
    document_name?: string;
}

// Helper to convert DB rows to camelCase
const mapDbToAnnouncement = (ann: DbAnnouncement): Announcement => ({
    id: ann.id,
    title: ann.title,
    content: ann.content,
    authorId: ann.author_id,
    authorName: ann.author_name,
    timestamp: ann.timestamp ? (typeof ann.timestamp === 'string' ? parseInt(ann.timestamp, 10) : Number(ann.timestamp)) : Date.now(),
    scope: ann.scope as 'alliansi' | 'mentor',
    targetHospitalIds: ann.target_hospital_ids || [],
    targetHospitalNames: ann.target_hospital_names || [],
    imageUrl: ann.image_url,
    documentUrl: ann.document_url,
    documentName: ann.document_name
});

// Get all announcements
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
    try {
        const response = await fetch('/api/announcements');
        if (!response.ok) throw new Error('Failed to fetch announcements');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getAllAnnouncements error:', error);
        return [];
    }
};

// Get announcement by ID
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => {
    try {
        const response = await fetch(`/api/announcements?id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch announcement');
        const { data } = await response.json();
        return data ? mapDbToAnnouncement(data) : null;
    } catch (error) {
        console.error('getAnnouncementById error:', error);
        return null;
    }
};

// Get global/alliansi announcements
export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
    try {
        const response = await fetch('/api/announcements?scope=alliansi');
        if (!response.ok) throw new Error('Failed to fetch global announcements');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getGlobalAnnouncements error:', error);
        return [];
    }
};

// Get mentor announcements
export const getMentorAnnouncements = async (): Promise<Announcement[]> => {
    try {
        const response = await fetch('/api/announcements?scope=mentor');
        if (!response.ok) throw new Error('Failed to fetch mentor announcements');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getMentorAnnouncements error:', error);
        return [];
    }
};

// Get announcements by author
export const getAnnouncementsByAuthor = async (authorId: string): Promise<Announcement[]> => {
    try {
        const response = await fetch(`/api/announcements?authorId=${authorId}`);
        if (!response.ok) throw new Error('Failed to fetch announcements by author');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getAnnouncementsByAuthor error:', error);
        return [];
    }
};

// Create new announcement
export const createAnnouncement = async (
    announcement: Omit<Announcement, 'id' | 'timestamp'>
): Promise<Announcement> => {
    try {
        const dbData = {
            title: announcement.title,
            content: announcement.content,
            author_id: announcement.authorId,
            author_name: announcement.authorName,
            scope: announcement.scope,
            target_hospital_ids: announcement.targetHospitalIds,
            target_hospital_names: announcement.targetHospitalNames,
            image_url: announcement.imageUrl,
            document_url: announcement.documentUrl,
            document_name: announcement.documentName
        };

        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create announcement');
        }

        const { data } = await response.json();
        return mapDbToAnnouncement(data);
    } catch (error) {
        console.error('createAnnouncement error:', error);
        throw error;
    }
};

// Update announcement
export const updateAnnouncement = async (
    id: string,
    updates: Partial<Omit<Announcement, 'id' | 'timestamp' | 'author_id' | 'author_name'>>
): Promise<Announcement> => {
    try {
        const dbUpdates: Partial<DbAnnouncement> & { id: string } = { id };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.scope !== undefined) dbUpdates.scope = updates.scope;
        if (updates.targetHospitalIds !== undefined) dbUpdates.target_hospital_ids = updates.targetHospitalIds;
        if (updates.targetHospitalNames !== undefined) dbUpdates.target_hospital_names = updates.targetHospitalNames;
        if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
        if (updates.documentUrl !== undefined) dbUpdates.document_url = updates.documentUrl;
        if (updates.documentName !== undefined) dbUpdates.document_name = updates.documentName;

        const response = await fetch('/api/announcements', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbUpdates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update announcement');
        }

        const { data } = await response.json();
        return mapDbToAnnouncement(data);
    } catch (error) {
        console.error('updateAnnouncement error:', error);
        throw error;
    }
};

// Delete announcement
export const deleteAnnouncement = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`/api/announcements?id=${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete announcement');
        }
    } catch (error) {
        console.error('deleteAnnouncement error:', error);
        throw error;
    }
};

// Get recent announcements
export const getRecentAnnouncements = async (limit: number = 10): Promise<Announcement[]> => {
    try {
        const response = await fetch(`/api/announcements?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch recent announcements');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getRecentAnnouncements error:', error);
        return [];
    }
};

// Upload announcement image
export const uploadAnnouncementImage = async (file: File, announcementId: string): Promise<string> => {
    try {
        const webpFile = await convertImageToWebP(file);
        const fileName = `${announcementId}-cover.webp`;
        const filePath = `${fileName}`;

        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('bucket', 'announcement');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload announcement image');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        console.error('uploadAnnouncementImage error:', error);
        throw error;
    }
};

// Upload announcement document
export const uploadAnnouncementDocument = async (file: File, announcementId: string): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${announcementId}-doc.${fileExt}`;
        const filePath = `${fileName}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'announcement');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload announcement document');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        console.error('uploadAnnouncementDocument error:', error);
        throw error;
    }
};

// Get announcements after a certain timestamp (for polling)
export const getAnnouncementsAfter = async (timestamp: number): Promise<Announcement[]> => {
    try {
        const response = await fetch(`/api/announcements?afterTimestamp=${timestamp}`);
        if (!response.ok) throw new Error('Failed to fetch announcements after timestamp');
        const { data } = await response.json();
        return (data || []).map(mapDbToAnnouncement);
    } catch (error) {
        console.error('getAnnouncementsAfter error:', error);
        return [];
    }
};
