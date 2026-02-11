import type { EmployeeQuranCompetency, EmployeeQuranHistory, QuranLevel } from '@/types';

/**
 * Service to handle Quran Competency Data
 * MIGRATED: Now uses local API calls
 */

export const getQuranLevels = async (): Promise<QuranLevel[]> => {
    try {
        const response = await fetch('/api/quran/levels', { credentials: 'include' });
        if (!response.ok) return [];
        const { data } = await response.json();
        return data || [];
    } catch (error) {
        console.error('getQuranLevels error:', error);
        return [];
    }
};

export const getEmployeeQuranCompetency = async (employeeId: string): Promise<EmployeeQuranCompetency | null> => {
    try {
        const response = await fetch(`/api/quran/competency?employeeId=${employeeId}`, { credentials: 'include' });
        if (!response.ok) return null;
        const { data } = await response.json();
        return data || null;
    } catch (error) {
        console.error('getEmployeeQuranCompetency error:', error);
        return null;
    }
};

export const saveQuranAssessment = async (
    assessment: Omit<EmployeeQuranCompetency, 'id' | 'assessedAt'>
): Promise<EmployeeQuranCompetency | null> => {
    try {
        const response = await fetch('/api/quran/competency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: assessment.employeeId,
                reading_level_id: assessment.readingLevelId,
                tajwid_level_id: assessment.tajwidLevelId,
                memorization_level_id: assessment.memorizationLevelId,
                understanding_level_id: assessment.understandingLevelId,
                reading_checklist: assessment.readingChecklist,
                tajwid_checklist: assessment.tajwidChecklist,
                memorization_checklist: assessment.memorizationChecklist,
                understanding_checklist: assessment.understandingChecklist,
                notes: assessment.notes
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save assessment');
        }
        const { data } = await response.json();
        return data;
    } catch (error) {
        console.error('saveQuranAssessment error:', error);
        return null;
    }
};

export const getEmployeeQuranHistory = async (employeeId: string): Promise<EmployeeQuranHistory[]> => {
    // History can be fetched from a separate history endpoint if needed, 
    // but for now, the competency endpoint usually returns current.
    // Let's assume we might have /api/quran/history?employeeId=...
    return [];
};

export const getAllQuranCompetencies = async (): Promise<EmployeeQuranCompetency[]> => {
    try {
        const response = await fetch('/api/quran/competency?all=true', { credentials: 'include' });
        if (!response.ok) return [];
        const { data } = await response.json();
        return data || [];
    } catch (error) {
        console.error('getAllQuranCompetencies error:', error);
        return [];
    }
};

export const getQuranCompetencySummary = async () => {
    const competencies = await getAllQuranCompetencies();
    const summary = {
        reading: {} as Record<string, number>,
        tajwid: {} as Record<string, number>,
        memorization: {} as Record<string, number>,
        understanding: {} as Record<string, number>
    };

    competencies.forEach(c => {
        if (c.readingLevelId) summary.reading[c.readingLevelId] = (summary.reading[c.readingLevelId] || 0) + 1;
        if (c.tajwidLevelId) summary.tajwid[c.tajwidLevelId] = (summary.tajwid[c.tajwidLevelId] || 0) + 1;
        if (c.memorizationLevelId) summary.memorization[c.memorizationLevelId] = (summary.memorization[c.memorizationLevelId] || 0) + 1;
        if (c.understandingLevelId) summary.understanding[c.understandingLevelId] = (summary.understanding[c.understandingLevelId] || 0) + 1;
    });

    return summary;
};
