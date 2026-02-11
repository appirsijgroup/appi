export interface Bookmark {
  id?: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: number;
  ayahText?: string;
}

interface DbBookmark {
  id: string;
  user_id: string;
  surah_number: number;
  surah_name: string;
  ayah_number: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  timestamp?: string | number | bigint;
  ayah_text?: string;
}


/**
 * Get all bookmarks for a user
 */
export const getUserBookmarks = async (userId: string): Promise<Bookmark[]> => {
  try {
    const response = await fetch(`/api/bookmarks?userId=${userId}`);
    if (!response.ok) return [];

    const { data } = await response.json();
    return (data || []).map((item: DbBookmark) => ({
      id: item.id,
      userId: item.user_id,
      surahNumber: item.surah_number,
      surahName: item.surah_name,
      ayahNumber: item.ayah_number,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      timestamp: item.timestamp ? (typeof item.timestamp === 'string' ? parseInt(item.timestamp, 10) : Number(item.timestamp)) : (item.created_at ? new Date(item.created_at).getTime() : Date.now()),
      ayahText: item.ayah_text || ''
    }));
  } catch (error) {
    console.error('getUserBookmarks error:', error);
    return [];
  }
};

/**
 * Check if a specific ayah is bookmarked
 */
export const isAyahBookmarked = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/bookmarks?userId=${userId}&surahNumber=${surahNumber}&ayahNumber=${ayahNumber}`);
    if (!response.ok) return false;

    const { data } = await response.json();
    return !!data;
  } catch (error) {
    return false;
  }
};

/**
 * Add a new bookmark
 */
export const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'timestamp'>): Promise<Bookmark | null> => {
  try {
    const response = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark)
    });

    if (!response.ok) return null;

    const { data } = (await response.json()) as { data: DbBookmark };
    return {
      id: data.id,
      userId: data.user_id,
      surahNumber: data.surah_number,
      surahName: data.surah_name,
      ayahNumber: data.ayah_number,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      timestamp: data.timestamp ? (typeof data.timestamp === 'string' ? parseInt(data.timestamp, 10) : Number(data.timestamp)) : (data.created_at ? new Date(data.created_at).getTime() : Date.now()),
      ayahText: data.ayah_text || ''
    };
  } catch (error) {
    console.error('addBookmark error:', error);
    return null;
  }
};

/**
 * Remove a bookmark
 */
export const removeBookmark = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<boolean> => {
  try {
    const response = await fetch(`/api/bookmarks?userId=${userId}&surahNumber=${surahNumber}&ayahNumber=${ayahNumber}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Toggle bookmark (add if not exists, remove if exists)
 */
export const toggleBookmark = async (
  userId: string,
  surahNumber: number,
  surahName: string,
  ayahNumber: number,
  ayahText?: string,
  notes?: string | null
): Promise<{ action: 'added' | 'removed'; bookmark?: Bookmark }> => {
  const isBookmarked = await isAyahBookmarked(userId, surahNumber, ayahNumber);

  if (isBookmarked) {
    await removeBookmark(userId, surahNumber, ayahNumber);
    return { action: 'removed' };
  } else {
    const bookmark = await addBookmark({
      userId,
      surahNumber,
      surahName,
      ayahNumber,
      ayahText,
      notes
    });
    return { action: 'added', bookmark: bookmark || undefined };
  }
};

/**
 * Update bookmark notes
 */
export const updateBookmarkNotes = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number,
  notes: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/bookmarks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, surahNumber, ayahNumber, notes })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Delete a bookmark by ID
 */
export const deleteBookmark = async (bookmarkId: string, userId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/bookmarks?id=${bookmarkId}&userId=${userId}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};
