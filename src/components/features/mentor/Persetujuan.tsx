'use client';
import React, { useMemo, useState, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type MonthlyReportSubmission, type DailyActivity, type TadarusRequest, type MissedPrayerRequest } from '@/types';
import { ArrowLeftIcon, CheckIcon, XIcon, CheckSquareIcon, SquareIcon, CheckCircleIcon, XMarkIcon, DocumentTextIcon } from '@/components/ui/Icons';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { DAILY_ACTIVITIES } from '@/constants/monthlyActivities';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import SimplePagination from '@/components/ui/SimplePagination';
import { CeklisMutabaahView } from '@/components/features/mutabaah/RapotView';
import { useHospitalStore } from '@/store/hospitalStore';

// Copied RejectionModal from MentorDashboard
const RejectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (notes: string) => void;
    title: string;
    prompt: string;
}> = ({ isOpen, onClose, onSubmit, title, prompt }) => {
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(notes);
        onClose();
        setNotes('');
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-blue-200 mb-4">{prompt}</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                    placeholder="Tuliskan catatan Anda di sini..."
                ></textarea>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} disabled={!notes} className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Kirim Penolakan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Copied MenteeReportDetailView from MentorDashboard
const MenteeReportDetailView: React.FC<{
    mentee: Employee;
    monthKey: string;
    onBack: () => void;
    dailyActivitiesConfig: DailyActivity[];
    reportContent?: Record<string, unknown> | string;
}> = ({ mentee, monthKey, onBack, dailyActivitiesConfig, reportContent }) => {

    const currentMonth = useMemo(() => new Date(monthKey + '-02'), [monthKey]);

    const progress = useMemo(() => {
        // 1. If we have reportContent (snapshot), use it!
        if (reportContent) {
            // Handle if it's a string (PostgreSQL might return it as string sometimes)
            return typeof reportContent === 'string' ? JSON.parse(reportContent) : reportContent;
        }
        // 2. Fallback to live data
        return mentee.monthlyActivities?.[monthKey] || {};
    }, [mentee, monthKey, reportContent]);
    const daysInMonth = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(), [currentMonth]);

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, DailyActivity[]>);
    }, [dailyActivitiesConfig]);

    const activityProgressCounts = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            acc[activity.id] = Object.values(progress).reduce((dayCount: number, dailyProgress: unknown) => {
                const p = dailyProgress as Record<string, boolean>;
                return dayCount + (p[activity.id] ? 1 : 0);
            }, 0);
            return acc;
        }, {} as Record<string, number>);
    }, [progress, dailyActivitiesConfig]);

    return (
        <div className="animate-view-change">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-all shadow-lg">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Kembali</span>
                </button>
                <div className="border-l-4 border-teal-400 pl-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-white">Detail Laporan Aktivitas</h3>
                    <p className="text-base sm:text-lg text-teal-200">{mentee.name} - {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sticky left-0 z-20 bg-gray-800 whitespace-nowrap">Aktivitas</th>
                            <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sticky left-[250px] z-20 bg-gray-800 whitespace-nowrap">Progres</th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                <th key={day} scope="col" className="px-2 py-3 font-bold text-center w-12 min-w-[48px] bg-gray-800 whitespace-nowrap">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedActivities).map(([category, activities]) => (
                            <Fragment key={category}>
                                <tr className="bg-gray-700">
                                    <td colSpan={daysInMonth + 2} className="px-3 py-2 font-bold text-teal-200 sticky left-0 z-10 bg-gray-700 whitespace-nowrap">
                                        {category}
                                    </td>
                                </tr>
                                {(activities as DailyActivity[]).map(activity => (
                                    <tr key={activity.id} className="border-b border-gray-700 hover:bg-white/5">
                                        <td className="px-3 py-3 font-medium text-left sticky left-0 bg-gray-800 z-10 whitespace-nowrap">{activity.title}</td>
                                        <td className="px-3 py-3 font-semibold text-center sticky left-[250px] bg-gray-800 z-10 whitespace-nowrap">
                                            {activityProgressCounts[activity.id] || 0} / {activity.monthlyTarget}
                                        </td>
                                        {Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')).map(day => {
                                            const isChecked = progress[day]?.[activity.id] || false;
                                            return (
                                                <td key={day} className="text-center border-l border-gray-700">
                                                    <div className="w-full h-full flex items-center justify-center py-3">
                                                        {isChecked ? (
                                                            <CheckSquareIcon className="w-6 h-6 text-teal-400" />
                                                        ) : (
                                                            <SquareIcon className="w-6 h-6 text-gray-600" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Status filter button component
interface StatusFilterButtonProps {
    filter: 'all' | 'pending' | 'approved' | 'rejected';
    label: string;
    activeFilter: 'all' | 'pending' | 'approved' | 'rejected';
    onFilterChange: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
}

const StatusFilterButton: React.FC<StatusFilterButtonProps> = ({ filter, label, activeFilter, onFilterChange }) => (
    <button onClick={() => onFilterChange(filter)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black rounded-full transition-all duration-200 ${activeFilter === filter ? 'bg-teal-500 text-gray-900 shadow-lg shadow-teal-500/20' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}>
        {label}
    </button>
);

// Main Component
interface PersetujuanProps {
    loggedInEmployee: Employee;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'kaunit') => void;
    allUsersData: Record<string, { employee: Employee; attendance: Record<string, unknown>; history: Record<string, unknown>; }>;
    // 🔥 NEW: Manual requests support
    pendingTadarusRequests?: TadarusRequest[]; // Using specific type
    pendingMissedPrayerRequests?: MissedPrayerRequest[];
    onReviewTadarusRequest?: (requestId: string, status: 'approved' | 'rejected') => void;
    onReviewMissedPrayerRequest?: (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => void;
    loadDetailedEmployeeData?: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    dailyActivitiesConfig: DailyActivity[];
    isReviewing?: boolean;
}

const Persetujuan: React.FC<PersetujuanProps> = ({
    loggedInEmployee,
    monthlyReportSubmissions,
    onReviewReport,
    allUsersData,
    pendingTadarusRequests = [],
    pendingMissedPrayerRequests = [],
    onReviewTadarusRequest,
    onReviewMissedPrayerRequest,
    loadDetailedEmployeeData,
    dailyActivitiesConfig,
    isReviewing = false
}) => {

    const searchParams = useSearchParams();
    const reportId = searchParams?.get('reportId');

    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<{ type: 'report' | 'tadarus' | 'prayer', id: string } | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<{ type: 'report', submission: MonthlyReportSubmission } | { type: 'tadarus', id: string } | { type: 'prayer', id: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [isRapotView, setIsRapotView] = useState(false);

    const { hospitals } = useHospitalStore();
    const activeHospital = hospitals.find(h => h.isActive) || hospitals[0] || null;

    // Handle initial reportId selection
    useEffect(() => {
        if (reportId && monthlyReportSubmissions.length > 0 && !selectedSubmissionId) {
            const found = monthlyReportSubmissions.find(s => s.id === reportId);
            if (found) {
                // Auto-selecting report from URL
                setSelectedSubmissionId(found.id);
                // Also update status filter if needed to show the report
                if (found.status.startsWith('rejected')) setStatusFilter('rejected');
                else if (found.status === 'approved') setStatusFilter('approved');
                else setStatusFilter('pending');
            }
        }
    }, [reportId, monthlyReportSubmissions, selectedSubmissionId]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Derived selected submission to ensure it's always fresh from props
    const selectedSubmission = useMemo(() => {
        const sub = monthlyReportSubmissions.find(s => s.id === selectedSubmissionId) || null;
        // Report status tracking log removed
        return sub;
    }, [selectedSubmissionId, monthlyReportSubmissions]);

    // 🔥 FIX: Load detailed data when a report is selected (target only the relevant month)
    useEffect(() => {
        if (selectedSubmission && loadDetailedEmployeeData) {
            const [y, m] = selectedSubmission.monthKey.split('-').map(Number);
            // Loading detailed data log removed
            loadDetailedEmployeeData(selectedSubmission.menteeId, m, y);
        }
    }, [selectedSubmission, loadDetailedEmployeeData]);

    const { isKaUnit } = useMemo(() => ({
        isKaUnit: loggedInEmployee.canBeKaUnit,
    }), [loggedInEmployee]);




    const submissionsForRole = useMemo(() => {
        const id = loggedInEmployee.id;
        const isAdmin = loggedInEmployee.role === 'admin' || loggedInEmployee.role === 'super-admin';
        const isSuper = loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH');

        return monthlyReportSubmissions.filter(s => {
            // 1. My own report (ALLOW Viewing to track status)
            if (s.menteeId === id) return true;

            // 2. Admin Catch-all (Super Admin/BPH sees everything)
            if (isSuper) return true;

            // 3. Regular Admin shows only managed hospitals
            if (isAdmin && !isSuper) {
                const managedIds = loggedInEmployee.managedHospitalIds || [];
                const mentee = allUsersData[s.menteeId]?.employee;
                const hId = mentee?.hospitalId || mentee?.hospital_id;
                return hId && managedIds.includes(hId);
            }

            // 4. Role-based filtering: ONLY show if it's MY turn to review
            const mentee = allUsersData[s.menteeId]?.employee;

            // Check if I'm the Mentor and report is pending_mentor
            if (s.status === 'pending_mentor') {
                // Show if I'm assigned as mentor in snapshot OR current mentor
                if (s.mentorId === id) return true;
                if (loggedInEmployee.canBeMentor && mentee?.mentorId === id) return true;
            }

            // Check if I'm the Atasan Langsung and report is pending_kaunit
            if (s.status === 'pending_kaunit') {
                // Show if I'm assigned as Atasan Langsung in snapshot OR current Atasan Langsung
                if (s.kaUnitId === id) return true;
                if (loggedInEmployee.canBeKaUnit && mentee?.kaUnitId === id) return true;
            }

            // Show approved/rejected reports if I was involved in the approval chain
            if (s.status === 'approved' || s.status.startsWith('rejected_')) {
                // Show if I was the mentor or Atasan Langsung for this report
                if (s.mentorId === id || s.kaUnitId === id) return true;
                // Or if I'm currently their mentor or Atasan Langsung
                if (mentee && (mentee.mentorId === id || mentee.kaUnitId === id)) return true;
            }

            return false;
        });
    }, [monthlyReportSubmissions, loggedInEmployee, allUsersData]);

    const availableYears = useMemo(() => {
        const years = new Set([...submissionsForRole.map(s => s.monthKey.substring(0, 4)),
        ...pendingTadarusRequests.map(r => r.date.substring(0, 4)),
        ...pendingMissedPrayerRequests.map(r => r.date.substring(0, 4))]);
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [submissionsForRole, pendingTadarusRequests, pendingMissedPrayerRequests]);

    const getReviewerRole = (submission: MonthlyReportSubmission): 'kaunit' | 'mentor' => {
        const s = submission;
        if (s.status === 'pending_mentor') return 'mentor';
        if (s.status === 'pending_kaunit') return 'kaunit';

        // Fallbacks based on user permissions and relationship
        const mentee = allUsersData[submission.menteeId]?.employee;
        const myId = loggedInEmployee.id;

        if (loggedInEmployee.canBeKaUnit && (submission.kaUnitId === myId || mentee?.kaUnitId === myId)) return 'kaunit';

        return 'mentor';
    };

    const handleConfirmApproval = () => {
        if (!approvalTarget) return;
        if (approvalTarget.type === 'report') {
            const submission = monthlyReportSubmissions.find(s => s.id === approvalTarget.id);
            if (submission) {
                const reviewerRole = getReviewerRole(submission);
                onReviewReport(approvalTarget.id, 'approved', 'Laporan telah disetujui.', reviewerRole);
            }
        } else if (approvalTarget.type === 'tadarus') {
            onReviewTadarusRequest?.(approvalTarget.id, 'approved');
        } else if (approvalTarget.type === 'prayer') {
            onReviewMissedPrayerRequest?.(approvalTarget.id, 'approved', 'Disetujui via panel persetujuan');
        }
        setApprovalTarget(null);
    };

    const handleRejectSubmit = (notes: string) => {
        if (!rejectionTarget) return;
        if (rejectionTarget.type === 'report') {
            const reviewerRole = getReviewerRole(rejectionTarget.submission);
            onReviewReport(rejectionTarget.submission.id, 'rejected', notes, reviewerRole);
        } else if (rejectionTarget.type === 'tadarus') {
            onReviewTadarusRequest?.(rejectionTarget.id, 'rejected');
        } else if (rejectionTarget.type === 'prayer') {
            onReviewMissedPrayerRequest?.(rejectionTarget.id, 'rejected', notes);
        }
        setRejectionTarget(null);
    };

    // Unified history items (Reports + Manual Requests)
    const unifiedHistory = useMemo(() => {
        const myId = loggedInEmployee.id;

        // 1. Map Monthly Reports
        const reports = submissionsForRole.map(s => {
            const mentee = allUsersData[s.menteeId]?.employee;
            const isPending = s.status.startsWith('pending_');
            const canReviewReport = isPending && s.menteeId !== myId && (
                (s.status === 'pending_mentor' && (s.mentorId === myId || mentee?.mentorId === myId)) ||
                (s.status === 'pending_kaunit' && (s.kaUnitId === myId || mentee?.kaUnitId === myId)) ||
                (loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH')) ||
                (loggedInEmployee.role === 'admin' && (loggedInEmployee.managedHospitalIds || []).includes(mentee?.hospitalId || mentee?.hospital_id || ''))
            );

            return {
                id: s.id,
                type: 'report' as const,
                menteeId: s.menteeId,
                menteeNip: mentee?.id || 'N/A',
                menteeName: s.menteeName,
                periode: `${new Date(s.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
                submittedAt: s.submittedAt ? (typeof s.submittedAt === 'string' ? parseInt(s.submittedAt) : Number(s.submittedAt)) : 0,
                monthKey: s.monthKey,
                status: s.status,
                notes: s.mentorNotes || s.kaUnitNotes || '-',
                canReview: canReviewReport,
                originalData: s
            };
        });

        // Helper to ensure we get a valid numeric timestamp
        const ensureTimestamp = (val: unknown, fallbackStr?: string): number => {
            if (!val && !fallbackStr) return 0;

            // 1. If it's already a number, use it (assume it's ms)
            if (typeof val === 'number') return val;

            // 2. If it's a string, try to distinguish between "numeric string" and "ISO/Date string"
            if (typeof val === 'string') {
                // If it looks like a large number (ms timestamp), parse it
                if (/^\d{10,}$/.test(val)) {
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) return parsed;
                }

                // Otherwise try parsing as a date
                const dateVal = new Date(val);
                if (!isNaN(dateVal.getTime())) return dateVal.getTime();
            }

            // 3. Fallback to date string if provided
            if (fallbackStr) {
                const date = new Date(fallbackStr + 'T12:00:00Z');
                return isNaN(date.getTime()) ? 0 : date.getTime();
            }

            return 0;
        };

        // 2. Map Tadarus Requests
        const tadarus = (pendingTadarusRequests || [])
            .filter((r: TadarusRequest) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                const isMyRequest = r.menteeId === myId;
                const isSuper = loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH');
                const isAdmin = loggedInEmployee.role === 'admin';

                // Category-based Routing Logic
                const categoryUpper = r.category?.toUpperCase() || '';
                const isAtasanReview = categoryUpper === 'KIE' || categoryUpper === 'DOA BERSAMA' || categoryUpper === 'DOA BERSAMA';

                // If I am the ASSIGNED reviewer (r.mentorId matches myId), I should see it regardless of logic (fallback)
                // This handles cases where I was explicitly assigned
                if (r.mentorId === myId) return true;

                // If I am Super Admin, I see everything
                if (isSuper) return true;

                // If I am Admin, I see if I manage the hospital
                if (isAdmin) {
                    const managedIds = loggedInEmployee.managedHospitalIds || [];
                    const hId = mentee?.hospitalId || mentee?.hospital_id;
                    return hId && managedIds.includes(hId);
                }

                // Logic for Role-based visibility
                if (isAtasanReview) {
                    // MUST be Atasan to see KIE/DOA
                    // MUST be Atasan to see KIE/DOA
                    // Check if I am their Atasan (KaUnit/Supervisor/Manager) - Checking ID directly handles delegation
                    const iAmKaUnit = mentee?.kaUnitId === myId;
                    const iAmSpv = mentee?.supervisorId === myId;
                    const iAmManager = mentee?.managerId === myId;

                    if (iAmKaUnit || iAmSpv || iAmManager) return true;
                } else {
                    // Start of Standard Activities (Mentor only)
                    // Check if I am their Mentor
                    const iAmMentor = loggedInEmployee.canBeMentor && mentee?.mentorId === myId;
                    if (iAmMentor) return true;
                }

                // If I submitted it, I see it (My Request)
                if (isMyRequest) return true;

                return false;
            })
            .map((r) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                return {
                    id: r.id,
                    type: 'tadarus' as const,
                    menteeId: r.menteeId,
                    menteeNip: mentee?.id || 'N/A',
                    menteeName: r.menteeName,
                    periode: `Tadarus/BBQ - ${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`,
                    submittedAt: ensureTimestamp(r.requestedAt, r.date),
                    monthKey: r.date.substring(0, 7),
                    status: r.status,
                    notes: r.notes || '-',
                    canReview: r.status === 'pending' && r.menteeId !== myId && (
                        r.mentorId === myId ||
                        (loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH')) ||
                        (loggedInEmployee.role === 'admin' && (loggedInEmployee.managedHospitalIds || []).includes(allUsersData[r.menteeId]?.employee?.hospitalId || allUsersData[r.menteeId]?.employee?.hospital_id || ''))
                    ),
                    originalData: r
                };
            });

        // 3. Map Missed Prayer Requests
        const missedPrayers = (pendingMissedPrayerRequests || [])
            .filter((r: MissedPrayerRequest) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                const isOriginalMentor = r.mentorId === myId;
                const isCurrentMentor = mentee?.mentorId === myId;
                const isMyRequest = r.menteeId === myId;
                const isSuper = loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH');
                const isAdmin = loggedInEmployee.role === 'admin';

                if (isOriginalMentor || isCurrentMentor || isMyRequest || isSuper) return true;

                if (loggedInEmployee.canBeKaUnit && mentee?.kaUnitId === myId) return true;

                if (isAdmin) {
                    const managedIds = loggedInEmployee.managedHospitalIds || [];
                    const hId = mentee?.hospitalId || mentee?.hospital_id;
                    return hId && managedIds.includes(hId);
                }

                return false;
            })
            .map((r) => {
                const mentee = allUsersData[r.menteeId]?.employee;
                return {
                    id: r.id,
                    type: 'prayer' as const,
                    menteeId: r.menteeId,
                    menteeNip: mentee?.id || 'N/A',
                    menteeName: r.menteeName,
                    periode: `Presensi Terlewat: ${r.prayerName} - ${new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`,
                    submittedAt: ensureTimestamp(r.requestedAt, r.date),
                    monthKey: r.date.substring(0, 7),
                    status: r.status,
                    notes: r.reason || r.mentorNotes || '-',
                    canReview: r.status === 'pending' && r.menteeId !== myId && (
                        allUsersData[r.menteeId]?.employee?.mentorId === myId ||
                        (loggedInEmployee.canBeKaUnit && allUsersData[r.menteeId]?.employee?.kaUnitId === myId) ||
                        (loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH')) ||
                        (loggedInEmployee.role === 'admin' && (loggedInEmployee.managedHospitalIds || []).includes(allUsersData[r.menteeId]?.employee?.hospitalId || allUsersData[r.menteeId]?.employee?.hospital_id || ''))
                    ),
                    originalData: r
                };
            });

        return [...reports, ...tadarus, ...missedPrayers].sort((a, b) => b.submittedAt - a.submittedAt);
    }, [submissionsForRole, pendingTadarusRequests, pendingMissedPrayerRequests, loggedInEmployee, allUsersData]);

    const filteredHistoryItems = useMemo(() => {
        return unifiedHistory.filter(item => {
            let statusMatch = false;
            const myId = loggedInEmployee.id;

            if (statusFilter === 'all') {
                statusMatch = true;
            } else if (statusFilter === 'pending') {
                // Broaden pending check: if it's waiting for me OR it's a pending status I part of
                statusMatch = item.canReview || (item.status.startsWith('pending_') && item.canReview);
            } else if (statusFilter === 'approved') {
                if (item.type === 'report') {
                    const s = item.originalData as MonthlyReportSubmission;
                    const mentee = allUsersData[s.menteeId]?.employee;
                    statusMatch = s.status === 'approved' ||
                        ((s.mentorId === myId || mentee?.mentorId === myId) && ['pending_kaunit'].includes(s.status));
                } else {
                    statusMatch = item.status === 'approved';
                }
            } else if (statusFilter === 'rejected') {
                statusMatch = item.status.startsWith('rejected');
            }

            if (!statusMatch) return false;

            const [year, month] = item.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);

            return yearMatch && monthMatch;
        });
    }, [unifiedHistory, statusFilter, filterYear, filterMonth, loggedInEmployee, allUsersData]);

    const totalPages = Math.ceil(filteredHistoryItems.length / itemsPerPage);
    const paginatedHistoryItems = filteredHistoryItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, filterYear, filterMonth]);

    const menteeDataForDetail = selectedSubmission ? allUsersData[selectedSubmission.menteeId]?.employee : null;

    return (
        <div className="w-full animate-fade-in">
            {selectedSubmission && !menteeDataForDetail ? (
                <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-16 h-16 border-4 border-teal-400/20 border-t-teal-400 rounded-full animate-spin mb-4"></div>
                    <p className="text-blue-200 font-medium">Menyipakkan data laporan...</p>
                </div>
            ) : selectedSubmission && menteeDataForDetail ? (
                <div className="bg-gray-800 shadow-2xl rounded-2xl border border-white/10 p-4 sm:p-8">
                    {/* Mentee Report Detail (Section) */}
                    {selectedSubmission && (
                        <div className="z-10 animate-view-change">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedSubmissionId(null)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-blue-200"
                                    >
                                        <ArrowLeftIcon className="w-5 h-5" />
                                        <span className="font-bold">Kembali ke Daftar</span>
                                    </button>
                                </div>

                                {/* Toggle View Mode */}
                                <div className="flex items-center bg-gray-900/40 p-1.5 rounded-full border border-white/10 shadow-inner">
                                    <button
                                        onClick={() => setIsRapotView(false)}
                                        className={`px-5 py-2.5 rounded-full text-xs font-black transition-all duration-300 flex items-center gap-2 ${!isRapotView ? 'bg-teal-500 text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <CheckSquareIcon className="w-4 h-4" />
                                        <span>Tabel Ceklis</span>
                                    </button>
                                    <button
                                        onClick={() => setIsRapotView(true)}
                                        className={`px-5 py-2.5 rounded-full text-xs font-black transition-all duration-300 flex items-center gap-2 ${isRapotView ? 'bg-teal-500 text-gray-900 shadow-xl scale-105' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        <DocumentTextIcon className="w-4 h-4" />
                                        <span>Lembar Mutabaah</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-800/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-8">
                                {isRapotView ? (
                                    <div className="p-2 sm:p-6">
                                        <CeklisMutabaahView
                                            employee={{
                                                ...allUsersData[selectedSubmission.menteeId]?.employee,
                                                id: selectedSubmission.menteeId,
                                                name: selectedSubmission.menteeName,
                                                mentorId: selectedSubmission.mentorId,
                                                kaUnitId: selectedSubmission.kaUnitId,
                                                managerId: selectedSubmission.managerId,
                                                supervisorId: selectedSubmission.supervisorId,
                                                dirutId: selectedSubmission.dirutId,
                                            } as Employee}
                                            dailyActivitiesConfig={dailyActivitiesConfig}
                                            selectedMonth={new Date(selectedSubmission.monthKey + '-02T00:00:00Z')}
                                            allUsersData={allUsersData}
                                            onBack={() => setIsRapotView(false)}
                                            hospital={activeHospital}
                                            isMentorApproved={selectedSubmission.status !== 'pending_mentor' && !selectedSubmission.status.startsWith('rejected_mentor')}
                                            reportContent={selectedSubmission.reports?.content || selectedSubmission.reports}
                                        />
                                    </div>
                                ) : (
                                    <MenteeReportDetailView
                                        mentee={{
                                            ...allUsersData[selectedSubmission.menteeId]?.employee,
                                            id: selectedSubmission.menteeId,
                                            name: selectedSubmission.menteeName,
                                            mentorId: selectedSubmission.mentorId,
                                            kaUnitId: selectedSubmission.kaUnitId,
                                            managerId: selectedSubmission.managerId,
                                            supervisorId: selectedSubmission.supervisorId,
                                            dirutId: selectedSubmission.dirutId,
                                        } as Employee}
                                        monthKey={selectedSubmission.monthKey}
                                        onBack={() => setSelectedSubmissionId(null)}
                                        dailyActivitiesConfig={dailyActivitiesConfig}
                                        reportContent={selectedSubmission.reports?.content || selectedSubmission.reports}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {/* Review Actions - Only show if current user can review this particular status */}
                    {(() => {
                        const s = selectedSubmission;
                        const mentee = allUsersData[s.menteeId]?.employee;
                        const myId = loggedInEmployee.id;
                        const isPending = s.status.startsWith('pending_');
                        const isSuper = loggedInEmployee.role === 'super-admin' || loggedInEmployee.canBeBPH || (loggedInEmployee.functional_roles || loggedInEmployee.functionalRoles)?.includes('BPH');
                        const isAdmin = loggedInEmployee.role === 'admin';
                        const managesMentee = (loggedInEmployee.managedHospitalIds || []).includes(mentee?.hospitalId || mentee?.hospital_id || '');
                        const canOverrule = isSuper || (isAdmin && managesMentee);

                        // Strict check: Only show buttons if it is the current stage for the user (or admin override for the CURRENT stage)
                        const canReview = isPending && s.menteeId !== myId && (
                            (s.status === 'pending_mentor' && (s.mentorId === myId || mentee?.mentorId === myId || canOverrule)) ||
                            (s.status === 'pending_kaunit' && (s.kaUnitId === myId || mentee?.kaUnitId === myId || canOverrule))
                        );

                        if (canReview) {
                            return (
                                <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-4">
                                    <button
                                        onClick={() => setApprovalTarget({ type: 'report', id: selectedSubmission.id })}
                                        disabled={isReviewing}
                                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-teal-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        {isReviewing ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        )}
                                        {isReviewing ? 'Memproses...' : 'Setujui Laporan'}
                                    </button>
                                    <button
                                        onClick={() => setRejectionTarget({ type: 'report', submission: selectedSubmission })}
                                        disabled={isReviewing}
                                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        {isReviewing ? (
                                            <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                        ) : (
                                            <XMarkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        )}
                                        {isReviewing ? 'Memproses...' : 'Tolak Laporan'}
                                    </button>
                                </div>
                            );
                        } else {
                            // Show current status instead of buttons if already reviewed
                            return (
                                <div className="mt-8 flex justify-center p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex flex-col items-center">
                                        <span className="text-gray-400 text-xs uppercase font-black mb-2 opacity-60">Status Laporan Saat Ini</span>
                                        <span className={`px-4 py-2 rounded-full font-black text-sm uppercase tracking-wider shadow-lg
                                            ${s.status === 'approved' ? 'bg-green-600 text-white' :
                                                s.status.startsWith('rejected') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                            {s.status.replace(/_/g, ' ')}
                                        </span>
                                        <p className="mt-2 text-xs text-blue-200 opacity-70 italic text-center">
                                            Laporan ini sedang dalam tahap {s.status === 'pending_kaunit' ? 'Atasan Langsung' : s.status.split('_').pop()} atau sudah selesai diproses.
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                            Riwayat <span className="text-teal-400">Persetujuan</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusFilterButton filter="all" label="Semua" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="pending" label="Menunggu" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="approved" label="Disetujui" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                            <StatusFilterButton filter="rejected" label="Ditolak" activeFilter={statusFilter} onFilterChange={setStatusFilter} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:flex items-center gap-2">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full lg:w-40 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer">
                            <option value="all" className="text-black bg-white">Semua Tahun</option>
                            {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                        </select>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full lg:w-48 bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer">
                            <option value="all" className="text-black bg-white">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month} className="text-black bg-white">{new Date(0, month - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none sm:rounded-xl border-y sm:border border-white/10 bg-black/20 min-h-[200px]">
                        <table className="min-w-full text-sm text-left text-white border-separate border-spacing-0">
                            <thead className="bg-gray-800/90 text-xs sm:text-sm uppercase text-teal-300 tracking-wider">
                                <tr>
                                    <th className="px-3 py-5 font-black border-b-2 border-teal-500/30 text-center whitespace-nowrap">No</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">NIP</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">NAMA</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">TIPE</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Periode Pengajuan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Tanggal Pengajuan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 whitespace-nowrap">Catatan</th>
                                    <th className="px-4 py-5 font-black border-b-2 border-teal-500/30 text-center whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedHistoryItems.length > 0 ? (
                                    paginatedHistoryItems.map((item, index) => (
                                        <tr key={`${item.type}-${item.id}`} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-3 py-4 text-center text-gray-500 font-mono text-xs whitespace-nowrap">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-sm text-white border-b border-white/5 whitespace-nowrap">
                                                {item.menteeNip}
                                            </td>
                                            <td className="px-4 py-4 font-semibold whitespace-nowrap text-white">
                                                {item.menteeName}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap border-b border-white/5">
                                                <span className={`text-xs uppercase font-black px-2 py-1 rounded w-fit tracking-tight
                                                        ${item.type === 'report' ? 'bg-blue-600 text-blue-50' :
                                                        item.type === 'tadarus' ? 'bg-indigo-600 text-indigo-50' :
                                                            'bg-purple-600 text-purple-50'}`}>
                                                    {item.type === 'report' ? 'Laporan' : item.type === 'tadarus' ? 'Tadarus/BBQ' : 'Presensi Terlewat'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-white font-bold text-xs border-b border-white/5 whitespace-nowrap">
                                                {item.periode}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-white font-medium text-xs border-b border-white/5">
                                                {item.submittedAt ? new Date(item.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-gray-100 text-xs leading-relaxed min-w-[200px] whitespace-nowrap border-b border-white/5">
                                                {item.notes}
                                            </td>
                                            <td className="px-4 py-4 text-center whitespace-nowrap">
                                                {item.type === 'report' ? (
                                                    item.canReview ? (
                                                        <button onClick={() => setSelectedSubmissionId(item.id)} className="px-4 py-1.5 rounded-full font-bold text-xs bg-teal-500/10 hover:bg-teal-400 text-teal-400 hover:text-white border border-teal-500/30 transition-all active:scale-95 shadow-lg">
                                                            Tinjau
                                                        </button>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-md border border-white/10 ${item.status === 'approved' ? 'bg-green-600 text-white' :
                                                                item.status.startsWith('rejected') ? 'bg-red-600 text-white' :
                                                                    'bg-blue-600 text-white'
                                                                }`}>
                                                                {item.status === 'approved' ? 'Disetujui' :
                                                                    item.status.startsWith('rejected') ? 'Ditolak' :
                                                                        'Menunggu'}
                                                            </span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.status === 'pending' && item.canReview ? (
                                                            <>
                                                                <button
                                                                    onClick={() => setRejectionTarget({ type: item.type as 'tadarus' | 'prayer', id: item.id })}
                                                                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 rounded text-[10px] font-bold transition-all"
                                                                >
                                                                    Tolak
                                                                </button>
                                                                <button
                                                                    onClick={() => setApprovalTarget({ type: item.type as 'tadarus' | 'prayer', id: item.id })}
                                                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold shadow-md transition-all active:scale-95"
                                                                >
                                                                    Setujui
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className={`px-2 py-1.5 rounded text-xs font-black uppercase tracking-tight ${item.status === 'approved' ? 'bg-green-600 text-white border border-white/20' : 'bg-red-600 text-white border border-white/20'}`}>
                                                                {item.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-20">
                                            <div className="flex flex-col items-center opacity-40">
                                                <CheckCircle2 className="w-12 h-12 text-gray-400 mb-3" />
                                                <p className="text-lg text-gray-400 font-medium">Tidak ada data ditemukan.</p>
                                                <p className="text-sm text-gray-500 mt-1">Gunakan filter di atas untuk melihat data lainnya.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <SimplePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={filteredHistoryItems.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />

                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-300 uppercase tracking-widest font-black">
                            Total {filteredHistoryItems.length} data riwayat persetujuan
                        </p>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                onConfirm={handleConfirmApproval}
                title="Konfirmasi Persetujuan"
                message="Apakah Anda yakin ingin menyetujui pengajuan ini?"
                confirmText="Ya, Setujui"
                confirmColorClass="bg-green-600 hover:bg-green-500"
            />

            <RejectionModal
                isOpen={!!rejectionTarget}
                onClose={() => setRejectionTarget(null)}
                onSubmit={handleRejectSubmit}
                title="Tolak Pengajuan"
                prompt="Berikan alasan penolakan pengajuan ini."
            />
        </div >
    );
};
export default Persetujuan;
