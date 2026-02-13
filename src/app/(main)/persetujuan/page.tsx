'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Persetujuan from '@/components/features/mentor/Persetujuan';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useDailyActivitiesStore } from '@/store/dailyActivitiesStore';
import { useNotificationStore } from '@/store/notificationStore';

export default function PersetujuanPage() {
    const { loggedInEmployee, allUsersData, loadDetailedEmployeeData } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const {
        monthlyReportSubmissions,
        tadarusRequests,
        missedPrayerRequests,
        loadMonthlyReportSubmissions,
        loadTadarusRequests,
        loadMissedPrayerRequests
    } = useGuidanceStore();

    // --- Auto-Fetch & Polling Data ---
    // Memastikan data persetujuan selalu fresh (realtime like)
    React.useEffect(() => {
        if (!loggedInEmployee?.id) return;

        const fetchData = () => {
            loadMonthlyReportSubmissions().catch(err => console.error("Error loading reports:", err));
            loadTadarusRequests().catch(err => console.error("Error loading tadarus:", err));
            loadMissedPrayerRequests().catch(err => console.error("Error loading prayers:", err));
        };

        // Initial fetch
        fetchData();

        // Polling setiap 15 detik agar terasa realtime bagi user
        const intervalId = setInterval(fetchData, 15000);

        return () => clearInterval(intervalId);
    }, [loggedInEmployee?.id, loadMonthlyReportSubmissions, loadTadarusRequests, loadMissedPrayerRequests]);

    const { addToast } = useUIStore();
    const [isReviewing, setIsReviewing] = useState(false);

    if (!loggedInEmployee) {
        return <div className="p-8 text-center text-gray-400">Silakan login terlebih dahulu.</div>;
    }

    const hasApprovalRole = loggedInEmployee.canBeMentor ||
        loggedInEmployee.canBeKaUnit ||
        loggedInEmployee.canBeManager ||
        loggedInEmployee.canBeSupervisor ||
        loggedInEmployee.canBeDirut ||
        ['admin', 'super-admin'].includes(loggedInEmployee.role.toLowerCase());

    if (!hasApprovalRole) {
        return <div className="p-8 text-center text-gray-400">Anda tidak memiliki akses ke halaman ini.</div>;
    }

    // Map internal role names to property prefixes (for DB/Typescript consistency)
    const roleToPropPrefix = (role: string) => {
        if (role === 'kaunit') return 'kaUnit';
        return role;
    };

    const handleReviewReport = async (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'kaunit') => {
        setIsReviewing(true);
        try {
            const { reviewMonthlyReport } = await import('@/services/monthlySubmissionService');
            const submission = monthlyReportSubmissions.find(s => s.id === submissionId);
            if (!submission) throw new Error("Laporan tidak ditemukan");

            // Processing review...

            // --- SMART STATUS TRANSITION (Mentor -> KaUnit -> Approved) ---
            let newStatus: string;

            if (decision === 'rejected') {
                newStatus = `rejected_${reviewerRole}`;
            } else {
                const currentReviewerId = loggedInEmployee.id;

                // Simplified Sequence: Only Ka Unit
                const nextRole = 'kaunit';
                const nextReviewerId = submission.kaUnitId;

                let foundNextStatus = 'approved';

                // If current is mentor and there's a different Ka Unit assigned, go to kaunit stage
                if (reviewerRole === 'mentor' && nextReviewerId && nextReviewerId !== currentReviewerId) {
                    foundNextStatus = 'pending_kaunit';
                }

                newStatus = foundNextStatus;
                // Next status determined
            }

            const propPrefix = roleToPropPrefix(reviewerRole);
            const reviews: any = {
                status: newStatus,
                [`${propPrefix}Notes`]: notes,
                [`${propPrefix}ReviewedAt`]: Date.now()
            };

            // Review payload logs removed

            const result = await reviewMonthlyReport(submissionId, reviews);

            if (result) {
                const { addOrUpdateMonthlyReportSubmission } = useGuidanceStore.getState();
                addOrUpdateMonthlyReportSubmission(result);

                // --- Notification Logic ---
                const { createNotification } = useNotificationStore.getState();

                // Notify Mentee
                const message = decision === 'approved'
                    ? `Laporan bulanan bulan ${submission.monthKey} telah disetujui oleh ${reviewerRole}${newStatus === 'approved' ? ' (Sudah Final)' : ''}.`
                    : `Laporan bulanan bulan ${submission.monthKey} DITOLAK oleh ${reviewerRole}. ${notes ? `Catatan: ${notes}` : ''}`;

                createNotification({
                    userId: submission.menteeId,
                    type: decision === 'approved' ? 'monthly_report_approved' : 'monthly_report_rejected',
                    title: `Laporan Bulanan ${decision === 'approved' ? 'Disetujui' : 'Ditolak'}`,
                    message: message,
                    linkTo: `/aktifitas-bulanan?reportId=${submissionId}` as any,
                    relatedEntityId: submissionId
                });

                // If approved and not final, notify Ka Unit
                if (decision === 'approved' && newStatus === 'pending_kaunit') {
                    const nextReviewerId = result.kaUnitId;

                    if (nextReviewerId) {
                        createNotification({
                            userId: nextReviewerId,
                            type: 'monthly_report_needs_review',
                            title: 'Validasi Laporan Diperlukan',
                            message: `Laporan ${submission.menteeName} telah disetujui oleh ${reviewerRole} dan menunggu validasi Anda sebagai Ka Unit.`,
                            linkTo: `/persetujuan?reportId=${submissionId}` as any,
                            relatedEntityId: submissionId
                        });
                    }
                }

                addToast(`Laporan berhasil ${decision === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
            } else {
                throw new Error('Server tidak mengembalikan data yang valid.');
            }
        } catch (error: any) {
            console.error('❌ [Persetujuan] Action error:', error);
            addToast(error.message || 'Terjadi kesalahan saat memproses laporan.', 'error');
        } finally {
            setIsReviewing(false);
        }
    };

    const handleReviewTadarusRequest = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const { updateTadarusRequest } = await import('@/services/tadarusService');

            await updateTadarusRequest(requestId, {
                status: status,
                reviewedAt: Date.now()
            });

            // Update local store - we need to fetch the full object or manually update
            const { addOrUpdateTadarusRequest, tadarusRequests } = useGuidanceStore.getState();
            const existing = tadarusRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateTadarusRequest({
                    ...existing,
                    status,
                    reviewedAt: Date.now()
                });
            }

            addToast(`Permohonan tadarus berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleReviewMissedPrayerRequest = async (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => {
        try {
            const { updateMissedPrayerRequest } = await import('@/services/prayerRequestService');

            await updateMissedPrayerRequest(requestId, {
                status,
                reviewedAt: Date.now(),
                mentorNotes
            });

            const { addOrUpdateMissedPrayerRequest, missedPrayerRequests } = useGuidanceStore.getState();
            const existing = missedPrayerRequests.find(r => r.id === requestId);
            if (existing) {
                addOrUpdateMissedPrayerRequest({
                    ...existing,
                    status,
                    reviewedAt: Date.now(),
                    mentorNotes: mentorNotes || existing.mentorNotes
                });
            }

            addToast(`Permohonan uzur sholat berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`, 'success');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Persetujuan & Validasi</h1>
                <p className="text-blue-200">Kelola persetujuan laporan bulanan dan permohonan manual dari tim Anda.</p>
            </div>

            <Persetujuan
                loggedInEmployee={loggedInEmployee}
                monthlyReportSubmissions={monthlyReportSubmissions}
                onReviewReport={handleReviewReport}
                allUsersData={allUsersData}
                pendingTadarusRequests={tadarusRequests}
                pendingMissedPrayerRequests={missedPrayerRequests}
                onReviewTadarusRequest={handleReviewTadarusRequest}
                onReviewMissedPrayerRequest={handleReviewMissedPrayerRequest}
                loadDetailedEmployeeData={loadDetailedEmployeeData}
                dailyActivitiesConfig={dailyActivitiesConfig}
                isReviewing={isReviewing}
            />
        </div>
    );
}
