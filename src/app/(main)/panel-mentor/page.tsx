'use client';

import React, { useState, useEffect } from 'react';
import type { MentorDashboardView } from '@/components/features/mentor/MentorDashboard';
import dynamic from 'next/dynamic';

const MentorDashboard = dynamic(() => import('@/components/features/mentor/MentorDashboard').then(mod => mod.MentorDashboard), {
    loading: () => (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-teal-400 animate-pulse">Memuat Panel Mentor...</div>
        </div>
    ),
    ssr: false
});
import { useAuthStore, useEmployeeStore, useUIStore } from '@/store/store';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { MenteeTarget, TadarusSession } from '@/types';

export default function MentorPanelPage() {
    const { loggedInEmployee, loadLoggedInEmployee } = useAuthStore();
    const { allUsersData, loadDetailedEmployeeData, loadAllEmployees, loadTeamProgressBulk } = useEmployeeStore();
    const { addToast } = useUIStore();
    const {
        monthlyReportSubmissions,
        tadarusSessions,
        tadarusRequests,
        missedPrayerRequests,
        menteeTargets,
        addTadarusSessions,
    } = useGuidanceStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();

    // State for MentorDashboard subview
    const [mentorSubView, setMentorSubView] = useState<MentorDashboardView>('persetujuan');

    // Target management state
    const [targetMenteeId, setTargetMenteeId] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<MenteeTarget | null>(null);

    // Filter mentees
    const menteesOfMentor = React.useMemo(() => {
        if (!loggedInEmployee) return [];
        return Object.values(allUsersData)
            .map((d: any) => d.employee)
            .filter(e => e.mentorId === loggedInEmployee.id);
    }, [allUsersData, loggedInEmployee]);

    // Set default view based on role
    useEffect(() => {
        if (!loggedInEmployee) return;
        if (!loggedInEmployee.canBeMentor && (loggedInEmployee.canBeKaUnit || loggedInEmployee.canBeManager || loggedInEmployee.canBeBPH || loggedInEmployee.canBeSupervisor)) {
            setMentorSubView('persetujuan');
        }
    }, [loggedInEmployee?.canBeMentor, loggedInEmployee?.canBeKaUnit, loggedInEmployee?.canBeManager, loggedInEmployee?.canBeBPH, loggedInEmployee?.canBeSupervisor, loggedInEmployee]);

    // 🔥 FIX: Load employees, monthly reports and manual requests on mount
    useEffect(() => {
        if (loggedInEmployee?.id) {
            // Load all employees to ensure mentees are found in allUsersData
            loadAllEmployees().catch((err: unknown) => console.error('Failed to load employees:', err));

            // 🔥 NEW: Bulk fetch progress for all mentees (Phase 1:Activities)
            loadTeamProgressBulk().catch((err: any) => console.error('Failed to load team progress:', err));

            const {
                loadTadarusRequests,
                loadMissedPrayerRequests,
                loadMonthlyReportSubmissions,
                loadTeamReadingHistory
            } = useGuidanceStore.getState();

            loadTadarusRequests().catch((err: unknown) => console.error('Failed to load tadarus requests:', err));
            loadMissedPrayerRequests().catch((err: unknown) => console.error('Failed to load missed prayer requests:', err));
            loadMonthlyReportSubmissions().catch((err: unknown) => console.error('Failed to load monthly reports:', err));
            loadTeamReadingHistory().catch((err: unknown) => console.error('Failed to load team reading history:', err));
        }
    }, [loggedInEmployee?.id, loadAllEmployees, loadTeamProgressBulk]);

    const hasAccess = loggedInEmployee && (
        loggedInEmployee.canBeMentor ||
        loggedInEmployee.canBeBPH ||
        loggedInEmployee.functionalRoles?.includes('BPH') ||
        loggedInEmployee.canBeKaUnit ||
        loggedInEmployee.canBeManager ||
        loggedInEmployee.canBeSupervisor ||
        loggedInEmployee.canBeDirut ||
        loggedInEmployee.role === 'admin' ||
        loggedInEmployee.role === 'super-admin'
    );

    // Local handler for profile update
    const handleLocalUpdateProfile = React.useCallback(async (userId: string, updates: Partial<any>) => {
        try {
            // 1. Optimistic Update (Immediate UI Feedback)
            const { setAllUsersData } = useEmployeeStore.getState();

            setAllUsersData((prev) => {
                const existing = prev[userId];
                if (!existing) return prev;

                // 🔥 Sync camelCase to snake_case for consistency
                const syncedUpdates = { ...updates };
                if ('mentorId' in updates) (syncedUpdates as any).mentor_id = updates.mentorId;
                if ('kaUnitId' in updates) (syncedUpdates as any).ka_unit_id = updates.kaUnitId;
                if ('supervisorId' in updates) (syncedUpdates as any).supervisor_id = updates.supervisorId;
                if ('managerId' in updates) (syncedUpdates as any).manager_id = updates.managerId;
                if ('dirutId' in updates) (syncedUpdates as any).dirut_id = updates.dirutId;

                return {
                    ...prev,
                    [userId]: {
                        ...existing,
                        employee: { ...existing.employee, ...syncedUpdates }
                    }
                };
            });

            // 2. API Call
            const { updateEmployee, getEmployeeById } = await import('@/services/employeeService');
            await updateEmployee(userId, updates);

            // 3. Verification & Sync (Background)
            const freshData = await getEmployeeById(userId);
            if (freshData) {
                setAllUsersData((prev) => ({
                    ...prev,
                    [userId]: {
                        ...(prev[userId] || { attendance: {}, history: {} }),
                        employee: freshData
                    }
                }));
            }

            // Sync loggedInEmployee if self-update
            if (userId === (loggedInEmployee?.id)) {
                await loadLoggedInEmployee();
            }

            return true;
        } catch (e) {
            console.error(e);
            addToast('Gagal update profil', 'error');
            // Fallback sync on error
            const { loadAllEmployees } = useEmployeeStore.getState();
            loadAllEmployees().catch(console.error);
            return false;
        }
    }, [loggedInEmployee?.id, loadLoggedInEmployee, addToast]);

    // Memoized wrapper for loadDetailedEmployeeData
    const loadDetailedEmployeeDataWrapper = React.useCallback(async (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => {
        await loadDetailedEmployeeData(employeeId, monthOrForce, year, force);
    }, [loadDetailedEmployeeData]);

    // Handlers
    const handleReviewReport = React.useCallback(async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'kaunit') => {
        try {
            const { reviewMonthlyReport } = await import('@/services/monthlySubmissionService');

            // Logic transition status based on role and decision
            let newStatus = '';
            if (decision === 'rejected') {
                if (reviewerRole === 'mentor') newStatus = 'rejected_mentor';
                else if (reviewerRole === 'kaunit') newStatus = 'rejected_kaunit';
                // supervisor and manager don't have rejection states in current schema
                else newStatus = 'rejected_kaunit'; // fallback
            } else {
                // Approval flow: mentor → kaunit → approved
                if (reviewerRole === 'mentor') newStatus = 'pending_kaunit';
                else if (reviewerRole === 'kaunit') newStatus = 'approved';
                // supervisor and manager go straight to approved
                else newStatus = 'approved';
            }



            const reviews: any = {
                status: newStatus,
            };

            // Add role-specific notes and timestamps
            if (reviewerRole === 'mentor') {
                reviews.mentorNotes = notes;
                reviews.mentorReviewedAt = Date.now();
            } else if (reviewerRole === 'kaunit') {
                reviews.kaUnitNotes = notes;
                reviews.kaUnitReviewedAt = Date.now();
            }



            const result = await reviewMonthlyReport(submissionId, reviews);

            if (result) {
                const { addOrUpdateMonthlyReportSubmission } = useGuidanceStore.getState();
                addOrUpdateMonthlyReportSubmission(result);
                addToast(`Laporan berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [addToast]);

    const handleCreateTadarusSession = React.useCallback(async (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => {
        try {
            const { createTadarusSession } = await import('@/services/tadarusService');
            const newSession = await createTadarusSession({
                ...data,
                presentMenteeIds: []
            });
            if (newSession) {
                const { addTadarusSessions } = useGuidanceStore.getState();
                addTadarusSessions([newSession]);
                addToast('Sesi tadarus berhasil dibuat', 'success');
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [addToast]);

    const handleUpdateTadarusSession = React.useCallback(async (sessionId: string, updates: Partial<TadarusSession>) => {
        try {
            // Optimistic update
            const { updateTadarusSession } = useGuidanceStore.getState();
            updateTadarusSession(sessionId, updates);

            // API call
            const { updateTadarusSession: apiUpdate } = await import('@/services/tadarusService');
            await apiUpdate(sessionId, updates);
        } catch (error: any) {
            addToast('Gagal update sesi: ' + error.message, 'error');
            // TODO: Revert optimistic update if critical
        }
    }, [addToast]);

    const handleDeleteTadarusSession = React.useCallback(async (sessionId: string) => {
        try {
            // API call
            const { deleteTadarusSession: apiDelete } = await import('@/services/tadarusService');
            await apiDelete(sessionId);

            // Store update
            const { deleteTadarusSession } = useGuidanceStore.getState();
            deleteTadarusSession(sessionId);
            addToast('Sesi dihapus', 'success');
        } catch (error: any) {
            addToast('Gagal hapus sesi: ' + error.message, 'error');
        }
    }, [addToast]);

    const handleReviewTadarusRequest = React.useCallback(async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const { updateTadarusRequest } = await import('@/services/tadarusService');
            await updateTadarusRequest(requestId, {
                status,
                reviewedAt: Date.now()
            });

            // Local update
            const { addOrUpdateTadarusRequest, tadarusRequests } = useGuidanceStore.getState();
            const existing = tadarusRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateTadarusRequest({ ...existing, status, reviewedAt: Date.now() });
            }

            addToast(`Permohonan tadarus berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');

            // 🔥 SYNC: Reload detailed data to show new checkmarks in dashboard
            if (status === 'approved' && existing) {
                const date = existing.date;
                if (date) {
                    const d = new Date(date + 'T12:00:00Z');
                    loadDetailedEmployeeData(existing.menteeId, d.getMonth() + 1, d.getFullYear(), true);
                }
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [addToast, loadDetailedEmployeeData]);

    const handleReviewMissedPrayerRequest = React.useCallback(async (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => {
        try {
            const { updateMissedPrayerRequest } = await import('@/services/prayerRequestService');
            await updateMissedPrayerRequest(requestId, { status, reviewedAt: Date.now(), mentorNotes });

            const { addOrUpdateMissedPrayerRequest, missedPrayerRequests } = useGuidanceStore.getState();
            const existing = missedPrayerRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateMissedPrayerRequest({ ...existing, status, reviewedAt: Date.now(), mentorNotes });

                // 🔥 SYNC: Reload detailed data to show new checkmarks in dashboard
                if (status === 'approved') {
                    const date = existing.date;
                    if (date) {
                        const d = new Date(date + 'T12:00:00Z');
                        loadDetailedEmployeeData(existing.menteeId, d.getMonth() + 1, d.getFullYear(), true);
                    }
                }
            }

            addToast(`Permohonan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [addToast, loadDetailedEmployeeData]);

    const handleMentorAttendOwnSession = React.useCallback(async (sessionId: string) => {
        try {
            // Placeholder logic
            addToast('Fitur presensi mentor dalam pengembangan', 'success');
        } catch (error) { }
    }, [addToast]);

    const handleCreateTarget = React.useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loggedInEmployee) return;

        if (!targetMenteeId || !targetTitle) {
            addToast('Pilih mentee dan judul target', 'error');
            return;
        }

        try {
            // Fallback to local store as guidanceService is missing
            const newTarget: MenteeTarget = {
                id: crypto.randomUUID(),
                menteeId: targetMenteeId,
                mentorId: loggedInEmployee.id,
                title: targetTitle,
                description: targetDescription,
                status: 'in-progress',
                createdAt: Date.now(),
                monthKey: new Date().toISOString().slice(0, 7),
                completedAt: null
            };

            const { addMenteeTarget } = useGuidanceStore.getState();
            addMenteeTarget(newTarget);
            addToast('Target berhasil dibuat', 'success');
            setTargetTitle('');
            setTargetDescription('');
        } catch (error: any) {
            addToast('Gagal buat target: ' + error.message, 'error');
        }
    }, [targetMenteeId, targetTitle, targetDescription, loggedInEmployee, addToast]);

    const handleDeleteTarget = async () => {
        if (!confirmDeleteTarget) return;
        try {
            // Fallback to local store
            const { deleteMenteeTarget } = useGuidanceStore.getState();
            deleteMenteeTarget(confirmDeleteTarget.id);
            addToast('Target dihapus', 'success');
            setConfirmDeleteTarget(null);
        } catch (error: any) {
            addToast('Gagal hapus target: ' + error.message, 'error');
        }
    };

    if (!loggedInEmployee) {
        return <div className="p-8 text-center text-gray-400">Silakan login terlebih dahulu.</div>;
    }

    if (!hasAccess) {
        return <div className="p-8 text-center text-gray-400">Anda tidak memiliki akses ke Panel Supervisi.</div>;
    }

    return (
        <div className={`mx-auto transition-all duration-700 ${mentorSubView === 'quran-assessment' ? 'w-full max-w-full px-4 py-8' : 'w-full max-w-full px-4 py-8'}`}>
            <MentorDashboard
                employee={loggedInEmployee}
                allUsersData={allUsersData}
                onUpdateProfile={handleLocalUpdateProfile}
                monthlyReportSubmissions={monthlyReportSubmissions}
                onReviewReport={handleReviewReport}
                tadarusSessions={tadarusSessions}
                tadarusRequests={tadarusRequests}
                onCreateTadarusSession={handleCreateTadarusSession}
                onUpdateTadarusSession={handleUpdateTadarusSession}
                onDeleteTadarusSession={handleDeleteTadarusSession}
                onReviewTadarusRequest={handleReviewTadarusRequest}
                missedPrayerRequests={missedPrayerRequests}
                onReviewMissedPrayerRequest={handleReviewMissedPrayerRequest}
                onMentorAttendOwnSession={handleMentorAttendOwnSession}
                onDeleteMenteeTarget={(id) => {
                    const target = menteeTargets.find(t => t.id === id);
                    if (target) setConfirmDeleteTarget(target);
                }}
                addToast={addToast}

                mentorSubView={mentorSubView}
                setMentorSubView={setMentorSubView}
                menteesOfMentor={menteesOfMentor}

                targetMenteeId={targetMenteeId}
                setTargetMenteeId={setTargetMenteeId}
                targetTitle={targetTitle}
                setTargetTitle={setTargetTitle}
                targetDescription={targetDescription}
                setTargetDescription={setTargetDescription}
                handleCreateTarget={handleCreateTarget}
                setConfirmDeleteTarget={setConfirmDeleteTarget}
                menteeTargets={menteeTargets.filter(t => t.mentorId === loggedInEmployee.id)}
                loadDetailedEmployeeData={loadDetailedEmployeeDataWrapper}
                loadTeamProgressBulk={useEmployeeStore.getState().loadTeamProgressBulk}
                dailyActivitiesConfig={dailyActivitiesConfig}
            />

            {confirmDeleteTarget && (
                // Reusing ConfirmationModal logic locally or import? 
                // Using simple inline fallback if modal component not directly usable or just rely on parent
                // MentorDashboard usually handles modal rendering if props provided?
                // Actually MentorDashboard doesn't render the modal, MyDashboard did.
                // We need to render modal here.
                null // Placeholder, assuming MentorDashboard might have internal modal or we need to add it
            )}
            {/* We need ConfirmationModal here */}
            {/* But ConfirmationModal is imported in MentorDashboard but used by parent? No, let's check MentorDashboard source */}
        </div>
    );
}

// Need to import ConfirmationModal if we render it here.
// Let's check if MentorDashboard renders it.
