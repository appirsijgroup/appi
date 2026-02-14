export interface QuranReadingSubmission {
  id?: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  submissionDate: string; // YYYY-MM-DD format
  createdAt?: string;
}

interface DbQuranHistory {
  id: string;
  employee_id: string;
  surah_number: number;
  surah_name: string;
  start_ayah: number;
  end_ayah: number;
  date: string;
  created_at: string;
}

// Interface for API response which might return camelCase or snake_case depending on route/controller
interface ApiQuranItem {
  id: string;
  employee_id?: string;
  employeeId?: string;
  surah_number?: number;
  surahNumber?: number;
  surah_name?: string;
  surahName?: string;
  start_ayah?: number;
  startAyah?: number;
  end_ayah?: number;
  endAyah?: number;
  date: string;
  created_at?: string;
  createdAt?: string;
}


/**
 * Submit a Quran reading session
 */
export const submitQuranReading = async (
  userId: string,
  surahNumber: number,
  surahName: string,
  startAyah: number,
  endAyah: number,
  submissionDate: string
): Promise<QuranReadingSubmission | null> => {
  try {
    const response = await fetch('/api/employees/reading-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quran',
        employeeId: userId,
        surahNumber,
        surahName,
        startAyah,
        endAyah,
        date: submissionDate
      })
    });

    if (!response.ok) throw new Error('Failed to submit reading');
    const { data } = (await response.json()) as { data: DbQuranHistory };

    return {
      id: data.id,
      userId: data.employee_id,
      surahNumber: data.surah_number,
      surahName: data.surah_name,
      startAyah: data.start_ayah,
      endAyah: data.end_ayah,
      submissionDate: data.date,
      createdAt: data.created_at
    };

  } catch (error) {
    console.error('submitQuranReading error:', error);
    throw error;
  }
};

/**
 * Get all Quran reading submissions for a user
 */
export const getQuranSubmissions = async (userId: string): Promise<QuranReadingSubmission[]> => {
  try {
    const response = await fetch(`/api/employees/reading-history?userId=${userId}`);
    if (!response.ok) return [];
    const { data } = (await response.json()) as { data: { quran: ApiQuranItem[] } };

    return (data?.quran || []).map((item) => ({
      id: item.id,
      userId: item.employeeId || item.employee_id || '',
      surahNumber: item.surahNumber || item.surah_number || 0,
      surahName: item.surahName || item.surah_name || '',
      startAyah: item.startAyah || item.start_ayah || 0,
      endAyah: item.endAyah || item.end_ayah || 0,
      submissionDate: item.date,
      createdAt: item.createdAt || item.created_at
    }));
  } catch (error) {
    console.error('getQuranSubmissions error:', error);
    return [];
  }
};

/**
 * Delete a Quran reading submission
 */
export const deleteQuranSubmission = async (submissionId: string, userId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/employees/reading-history?id=${submissionId}&type=quran`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('deleteQuranSubmission error:', error);
    return false;
  }
};

/**
 * Get Quran submissions for a specific date range
 */
export const getQuranSubmissionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<QuranReadingSubmission[]> => {
  try {
    const submissions = await getQuranSubmissions(userId);
    return submissions.filter(s => s.submissionDate >= startDate && s.submissionDate <= endDate);
  } catch (error) {
    return [];
  }
};

/**
 * Get total ayahs read in a specific period
 */
export const getTotalAyahsRead = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> => {
  try {
    const submissions = await getQuranSubmissionsByDateRange(userId, startDate, endDate);

    const totalAyahs = submissions.reduce((total, submission) => {
      const start = Number(submission.startAyah) || 0;
      const end = Number(submission.endAyah) || 0;
      return total + (end - start + 1);
    }, 0);

    return totalAyahs;
  } catch (error) {
    return 0;
  }
};

/**
 * Convert Quran submissions/history to Mutabaah activities format
 */
export const convertQuranSubmissionsToActivities = async (userId: string): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
  try {
    const submissions = await getQuranSubmissions(userId);
    const result: Record<string, Record<string, Record<string, boolean>>> = {};

    submissions.forEach((submission) => {
      const dateStr = submission.submissionDate; // YYYY-MM-DD
      if (!dateStr) return;

      const monthKey = dateStr.substring(0, 7); // YYYY-MM
      const dayKey = dateStr.substring(8, 10); // DD

      if (!result[monthKey]) result[monthKey] = {};
      if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};

      // Mark the 'baca_alquran_buku' activity as completed
      result[monthKey][dayKey]['baca_alquran_buku'] = true;
    });

    return result;
  } catch (error) {
    console.error('convertQuranSubmissionsToActivities error:', error);
    return {};
  }
};
