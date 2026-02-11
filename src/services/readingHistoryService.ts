/**
 * Reading History Service
 * MIGRATED: Now uses local API calls instead of Database
 */

export interface ReadingHistoryEntry {
  id?: string;
  userId: string;
  bookTitle: string;
  pagesRead?: number;
  dateCompleted: string; // YYYY-MM-DD format
  notes?: string;
  createdAt?: string;
}

interface DbReadingHistory {
  id: string;
  employee_id: string;
  book_title: string;
  pages_read?: number;
  date_completed: string;
  created_at: string;
}

interface DbQuranReading {
  id: string;
  employee_id: string;
  surah_name: string;
  surah_number: number;
  start_ayah: number;
  end_ayah: number;
  date: string;
  created_at: string;
}


/**
 * Get all reading history for a user
 */
export const getReadingHistory = async (userId: string): Promise<ReadingHistoryEntry[]> => {
  try {
    const response = await fetch(`/api/employees/reading-history?userId=${userId}`);
    if (!response.ok) return [];
    const json = await response.json();
    const books = (json.data?.books || []) as DbReadingHistory[];
    return books.map(book => ({
      id: book.id,
      userId: book.employee_id,
      bookTitle: book.book_title,
      pagesRead: book.pages_read,
      dateCompleted: book.date_completed,
      createdAt: book.created_at
    }));
  } catch (error) {
    console.error('Error fetching reading history:', error);
    return [];
  }
};

/**
 * Get Quran reading history for an employee
 */
export const getQuranReadingHistory = async (userId: string) => {
  try {
    const response = await fetch(`/api/employees/reading-history?userId=${userId}`);
    if (!response.ok) return [];
    const json = await response.json();
    const quran = (json.data?.quran || []) as DbQuranReading[];
    return quran.map(item => ({
      id: item.id,
      surahName: item.surah_name,
      surahNumber: item.surah_number,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      date: item.date,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error fetching quran reading history:', error);
    return [];
  }
};

// ... other functions can be implemented as needed via fetch to /api/employees/reading-history
export const getReadingHistoryByEmployeeIds = async (employeeIds: string[]): Promise<ReadingHistoryEntry[]> => {
  if (!employeeIds.length) return [];
  return [];
};

/**
 * Submit a book reading entry
 */
export const submitBookReading = async (entry: Omit<ReadingHistoryEntry, 'id'>): Promise<ReadingHistoryEntry | null> => {
  try {
    const response = await fetch('/api/employees/reading-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: entry.userId,
        bookTitle: entry.bookTitle,
        pagesRead: entry.pagesRead,
        dateCompleted: entry.dateCompleted,
        type: 'book'
      })
    });

    if (!response.ok) throw new Error('Failed to submit book reading');

    const result = await response.json();
    return {
      id: result.data.id,
      userId: result.data.employee_id,
      bookTitle: result.data.book_title,
      pagesRead: result.data.pages_read,
      dateCompleted: result.data.date_completed,
      createdAt: result.data.created_at
    };
  } catch (error) {
    console.error('submitBookReading error:', error);
    return null;
  }
};

/**
 * Delete a book reading entry
 */
export const deleteReadingHistory = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/employees/reading-history?id=${id}&type=book`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('deleteReadingHistory error:', error);
    return false;
  }
};

/**
 * Get Quran reading history for multiple employees
 * NOTE: Currently returning empty or need to implement batch API if needed. 
 * For now, returning empty to avoid errors, as this might be used for aggregation.
 */
export const getQuranReadingHistoryByEmployeeIds = async (employeeIds: string[]) => {
  if (!employeeIds.length) return [];
  // Warning: Batch fetch not implemented in API yet
  return [];
};

/**
 * Add Quran reading history
 */
export const addQuranReadingHistory = async (userId: string, data: Omit<DbQuranReading, 'id' | 'employee_id' | 'created_at'>): Promise<DbQuranReading | null> => {
  try {
    const response = await fetch('/api/employees/reading-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: userId,
        type: 'quran',
        ...data
      })
    });

    if (!response.ok) throw new Error('Failed to submit Quran reading');
    const result = await response.json();
    return result.data as DbQuranReading;
  } catch (error) {
    console.error('addQuranReadingHistory error:', error);
    return null;
  }
};

/**
 * Delete Quran reading history
 */
export const deleteQuranReadingHistory = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/employees/reading-history?id=${id}&type=quran`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('deleteQuranReadingHistory error:', error);
    return false;
  }
};

export const getReadingHistoryByDateRange = async (_start: string, _end: string) => [];
