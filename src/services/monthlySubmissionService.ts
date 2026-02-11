import type { MonthlyReportSubmission } from '@/types';
import { timeValidationService } from './timeValidationService';

// Re-export the type from types.ts to maintain compatibility
export type { MonthlyReportSubmission };

export interface MonthlyReportSubmissionPayload {
  menteeName: string;
  mentorId: string;
  kaUnitId?: string;
  content?: any; // Snapshot of activities
  [key: string]: any;
}


// Helper to fetch from API
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      // Can log specific status if needed
      return null;
    }
    const json = await response.json();
    // Support both { data: ... } and direct data responses
    return (json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    console.error(`API Fetch error for ${url}:`, error);
    return null;
  }
}

/**
 * Get all monthly report submissions for a user
 */
export const getUserMonthlyReports = async (userId: string): Promise<MonthlyReportSubmission[]> => {
  // 🔥 CACHE BUSTING: Add timestamp to ensure browser doesn't return old cached data
  const data = await fetchApi<MonthlyReportSubmission[]>(`/api/monthly-reports?menteeId=${userId}&_t=${Date.now()}`);
  return data || [];
};

/**
 * Get monthly report for a specific month
 */
export const getMonthlyReport = async (
  userId: string,
  monthKey: string
): Promise<MonthlyReportSubmission | null> => {
  // We can filter on client side or add specific query param if needed. 
  // Reusing the get by menteeId for now as it's likely cached or fast enough.
  const reports = await getUserMonthlyReports(userId);
  return reports.find(r => r.monthKey === monthKey) || null;
};

/**
 * Check if user has already submitted a report for a given month
 */
export const hasSubmittedReport = async (
  userId: string,
  monthKey: string
): Promise<boolean> => {
  const report = await getMonthlyReport(userId, monthKey);
  return !!report;
};

/**
 * Submit a monthly report
 * Now calls POST /api/monthly-reports
 */
export const submitMonthlyReport = async (
  userId: string,
  monthKey: string,
  reportData: MonthlyReportSubmissionPayload
): Promise<MonthlyReportSubmission | null> => {
  try {
    // Validation logic kept on client for immediate feedback, but server also validates
    const timeValidation = timeValidationService.validateTime();
    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Report submission denied.');
    }

    // Construct payload matching API expectation
    // The API likely expects { submission: ... } or just body
    const payload = {
      menteeId: userId,
      monthKey,
      reportData, // Contains menteeName, mentorId etc.
      submittedAt: timeValidation.correctedTime.getTime()
    };

    const response = await fetch('/api/monthly-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gagal mengirim laporan. Silakan coba lagi.');
    }

    const result = await response.json();
    return result.data as MonthlyReportSubmission;

  } catch (error) {
    console.error("Error submitting monthly report:", error);
    throw error; // Throw the actual error so the UI can catch it
  }
};

/**
 * Update an existing monthly report
 */
export const updateMonthlyReport = async (
  reportId: string,
  userId: string,
  reportData: MonthlyReportSubmissionPayload
): Promise<boolean> => {
  try {
    const timeValidation = timeValidationService.validateTime();
    if (!timeValidation.isValid) throw new Error('Invalid time');

    const response = await fetch('/api/monthly-reports', {
      method: 'PATCH', // Update existing
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_content',
        reportId,
        menteeId: userId,
        userId: userId, // for auth check
        reportData,
        updatedAt: timeValidation.correctedTime.getTime()
      })
    });

    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Review a monthly report
 */
export const reviewMonthlyReport = async (
  reportId: string,
  reviews: {
    status: string;
    mentorNotes?: string;
    mentorReviewedAt?: number;
    kaUnitNotes?: string;
    kaUnitReviewedAt?: number;
    [key: string]: any;
  }
): Promise<MonthlyReportSubmission | null> => {
  try {
    const response = await fetch('/api/monthly-reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review',
        reportId,
        reviews
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || err.details || 'Gagal memproses persetujuan laporan.');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error reviewing report:", error);
    throw error;
  }
};

/**
 * Check if a report has been submitted for a specific month
 */
export const hasSubmittedMonthlyReport = async (
  userId: string,
  monthKey: string
): Promise<boolean> => {
  return hasSubmittedReport(userId, monthKey);
};

/**
 * Get all monthly report submissions for a specific superior (Combined roles)
 */
export const getMonthlyReportsForSuperiorCombined = async (userId: string, roles: Array<'mentorId' | 'kaUnitId'>): Promise<MonthlyReportSubmission[]> => {
  if (roles.length === 0) return [];

  // Pass roles as comma-separated string to API
  const rolesParam = roles.join(',');
  // 🔥 CACHE BUSTING: Add timestamp
  const data = await fetchApi<MonthlyReportSubmission[]>(`/api/monthly-reports?superiorId=${userId}&roles=${rolesParam}&_t=${Date.now()}`);
  return data || [];
};

/**
 * Get all monthly report submissions for a specific superior (LEGACY - single role)
 */
export const getMonthlyReportsForSuperior = async (userId: string, roleKey: 'mentorId' | 'kaUnitId'): Promise<MonthlyReportSubmission[]> => {
  return getMonthlyReportsForSuperiorCombined(userId, [roleKey]);
};

/**
 * Get monthly reports for a list of mentees (Fallback/Legacy support)
 */
export const getMonthlyReportsByMenteeIds = async (menteeIds: string[]): Promise<MonthlyReportSubmission[]> => {
  if (!menteeIds || menteeIds.length === 0) return [];

  // Use POST for search to avoid long query strings? Or just GET with repeated params?
  // Let's use a specialized query param
  // If list is too long, we might need a POST search endpoint. 
  // For now assuming GET is fine or we iterate.

  // IMPLEMENTATION: GET /api/monthly-reports?menteeIds=id1,id2,...
  const idsParam = menteeIds.join(',');
  const data = await fetchApi<MonthlyReportSubmission[]>(`/api/monthly-reports?menteeIds=${idsParam}`);
  return data || [];
};
