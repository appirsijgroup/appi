import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type MyDashboardViewProps, Employee, MonthlyReportSubmission, MenteeTarget, DailyActivity, ReadingHistory } from '@/types';
import { isAdministrativeAccount, isAnyAdmin } from '@/lib/rolePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Analytics from '@/components/features/admin/Analytics';
import { getTodayLocalDateString, createLocalDate, normalizeDate, formatDateTimeIndonesia, formatDateIndonesia } from '@/utils/dateUtils';
import { timeValidationService } from '@/services/timeValidationService';
import { useUIStore } from '@/store/store';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

interface TabButtonProps {
    label: string;
    icon: React.ElementType;
    active: boolean;
    onClick: () => void;
    count?: number;
}

const TabButton = ({ label, icon: Icon, active, onClick, count }: TabButtonProps) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap relative
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
        {count !== undefined && count > 0 && (
            <span className="absolute top-2 right-2 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg animate-pulse">
                {count}
            </span>
        )}
    </button>
);

interface KinerjaViewProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    currentDate: Date;
    onNavigateMonth: (direction: 'prev' | 'next') => void;
    isNextMonthFuture: () => boolean;
}

const KinerjaView = ({ employee, dailyActivitiesConfig, currentDate, onNavigateMonth, isNextMonthFuture }: KinerjaViewProps) => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const currentMonthKey = React.useMemo(() => {
        return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }, [currentDate]);

    const { performanceData, monthlyStats } = useMemo(() => {
        const monthProgress = employee.monthlyActivities?.[currentMonthKey] || {};
        const enrichedMonthProgress = { ...monthProgress };

        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            employee.readingHistory.forEach((history: ReadingHistory) => {
                const date = history.dateCompleted;
                const monthKeyCheck = date.substring(0, 7);
                if (monthKeyCheck === currentMonthKey) {
                    const dayKey = date.substring(8, 10);
                    if (!enrichedMonthProgress[dayKey]) enrichedMonthProgress[dayKey] = {};
                    enrichedMonthProgress[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            employee.quranReadingHistory.forEach((history: { date: string }) => {
                const date = history.date;
                const monthKeyCheck = date.substring(0, 7);
                if (monthKeyCheck === currentMonthKey) {
                    const dayKey = date.substring(8, 10);
                    if (!enrichedMonthProgress[dayKey]) enrichedMonthProgress[dayKey] = {};
                    enrichedMonthProgress[dayKey]['baca_alquran_buku'] = true;
                }
            });
        }

        const categories: Record<string, { name: string; details: { id: string; title: string; target: number; achieved: number; percentage: number }[] }> = {
            'SIDIQ (Integritas)': { name: 'SIDIQ (Integritas)', details: [] },
            'TABLIGH (Teamwork)': { name: 'TABLIGH (Teamwork)', details: [] },
            'AMANAH (Disiplin)': { name: 'AMANAH (Disiplin)', details: [] },
            'FATONAH (Belajar)': { name: 'FATONAH (Belajar)', details: [] },
        };

        let totalReadingCount = 0;
        if (employee.readingHistory && Array.isArray(employee.readingHistory)) {
            totalReadingCount += employee.readingHistory.filter((h: ReadingHistory) => h.dateCompleted.startsWith(currentMonthKey)).length;
        }
        if (employee.quranReadingHistory && Array.isArray(employee.quranReadingHistory)) {
            totalReadingCount += employee.quranReadingHistory.filter((h: { date: string }) => h.date.startsWith(currentMonthKey)).length;
        }

        dailyActivitiesConfig.forEach((activity: DailyActivity) => {
            if (categories[activity.category]) {
                let achieved = 0;
                if (activity.id === 'baca_alquran_buku') {
                    achieved = totalReadingCount;
                } else {
                    achieved = Object.values(enrichedMonthProgress).reduce((dayCount: number, dailyProgress: unknown) => {
                        const progress = dailyProgress as Record<string, boolean>;
                        return dayCount + (progress[activity.id] ? 1 : 0);
                    }, 0);
                }

                const percentage = activity.monthlyTarget > 0 ? Math.min(100, Math.round((achieved / activity.monthlyTarget) * 100)) : 0;

                categories[activity.category].details.push({
                    id: activity.id,
                    title: activity.title,
                    target: activity.monthlyTarget,
                    achieved,
                    percentage,
                });
            }
        });

        const categoryResults = Object.values(categories).map(cat => {
            const totalPercentage = cat.details.reduce((sum, detail) => sum + detail.percentage, 0);
            const averageScore = cat.details.length > 0 ? Math.round(totalPercentage / cat.details.length) : 0;
            return { name: cat.name, Persentase: averageScore };
        });

        const statsForCards = Object.entries(categories).reduce((acc, [key, value]) => {
            acc[key] = value.details.map(d => ({ title: d.title, achieved: d.achieved, target: d.target }));
            return acc;
        }, {} as Record<string, { title: string; achieved: number; target: number }[]>);

        return { performanceData: categoryResults, monthlyStats: statsForCards };
    }, [currentMonthKey, employee?.monthlyActivities, dailyActivitiesConfig, employee?.readingHistory, employee?.quranReadingHistory]);

    return (
        <div className="space-y-6">
            {/* Month Navigation */}
            <div className="flex justify-center mb-6">
                <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 shadow-lg backdrop-blur-sm">
                    <button
                        onClick={() => onNavigateMonth('prev')}
                        className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Bulan Sebelumnya"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="min-w-[180px] text-center px-4">
                        <span className="text-[10px] text-teal-400 uppercase block tracking-wider font-bold">Periode Laporan</span>
                        <span className="font-bold text-base text-white">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <button
                        onClick={() => onNavigateMonth('next')}
                        disabled={isNextMonthFuture()}
                        className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Bulan Berikutnya"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-black/20 p-6 rounded-2xl shadow-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Progres Bulan Ini</h3>
                <div className="md:hidden text-center text-xs text-blue-200 mb-2 flex items-center justify-center gap-2">
                    <span>← Geser kiri/kanan untuk melihat grafik →</span>
                </div>
                <div className="overflow-x-auto pb-4 -mx-2 px-2 md:overflow-x-visible md:mx-0 md:px-0">
                    <div className="w-full min-w-[700px] md:min-w-0" style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                                    <YAxis stroke="#cbd5e1" allowDecimals={false} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                    <Bar dataKey="Persentase" isAnimationActive={false}>
                                        <LabelList dataKey="Persentase" position="top" fill="#e2e8f0" fontSize={12} formatter={(value: any) => typeof value === 'number' ? `${value}%` : (value ? `${value}%` : '')} />
                                        {performanceData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(monthlyStats).map(([category, activities]) => (
                    <div key={category} className="bg-black/20 p-6 rounded-2xl shadow-lg border border-white/10">
                        <h4 className="font-bold text-lg text-teal-300 mb-4">{category}</h4>
                        <div className="space-y-4">
                            {activities.map(activity => {
                                const percentage = activity.target > 0 ? Math.min(100, (activity.achieved / activity.target) * 100) : 0;
                                return (
                                    <div key={activity.title}>
                                        <div className="flex justify-between items-center mb-1 text-sm gap-2">
                                            <span className="font-medium text-white text-sm leading-tight wrap-break-word shrink">{activity.title}</span>
                                            <span className="font-semibold text-blue-200 text-xs shrink-0">{activity.achieved} / {activity.target}</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-2">
                                            <div
                                                className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MemoizedKinerjaView = KinerjaView;

const MyDashboard: React.FC<MyDashboardViewProps> = (props) => {
    const {
        employee,
        initialTab,
        onTabChange,
        dailyActivitiesConfig,
        menteeTargets,
        onCreateMenteeTarget,
        allUsersData,
        addToast,
        monthlyReportSubmissions,
        onLoadEmployees,
    } = props;

    type DashboardTab = 'kinerja' | 'analytics';

    const [activeTab, setActiveTab] = useState<DashboardTab>(
        isAdministrativeAccount(employee.id) ? 'analytics' : (initialTab as DashboardTab || 'kinerja')
    );
    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (!isInitializedRef.current && initialTab) {
            const newTab = initialTab as DashboardTab;
            setActiveTab(newTab);
            isInitializedRef.current = true;
            if (onTabChange) {
                onTabChange();
            }
        }
    }, [initialTab, onTabChange]);

    const hasMentorRole = employee.canBeMentor === true || employee.can_be_mentor === true;
    const hasApprovalRole = employee.canBeKaUnit === true || employee.can_be_ka_unit === true;
    const functionalRoles = employee.functionalRoles || employee.functional_roles || [];

    const canAccessAnalytics = employee.role === 'super-admin' ||
        employee.role === 'admin' ||
        (employee.role === 'user' && functionalRoles.length > 0) ||
        isAdministrativeAccount(employee.id);

    useEffect(() => {
        const shouldLoadEmployees = (hasMentorRole || hasApprovalRole) || activeTab === 'analytics';
        if (shouldLoadEmployees && onLoadEmployees) {
            const userCount = Object.keys(allUsersData).length;
            if (userCount <= 1) {
                onLoadEmployees();
            }
        }
    }, [hasMentorRole, hasApprovalRole, activeTab, allUsersData, onLoadEmployees]);

    const [currentDate, setCurrentDate] = useState(new Date());

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(1); // Reset date to 1 to avoid month skip issues
            d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1));
            return d;
        });
    };

    const isNextMonthFuture = () => {
        const n = new Date(currentDate);
        n.setDate(1);
        n.setMonth(n.getMonth() + 1);
        return n > new Date();
    };

    const renderContent = () => {
        if (props.isLoadingEmployees && activeTab === 'analytics') {
            return (
                <div className="flex flex-col items-center justify-center p-12 sm:p-20 bg-black/20 rounded-2xl border border-white/5">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
                    <p className="text-teal-200/60 text-sm font-medium animate-pulse">Memuat data...</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'kinerja':
                return (
                    <MemoizedKinerjaView
                        employee={employee}
                        dailyActivitiesConfig={dailyActivitiesConfig}
                        currentDate={currentDate}
                        onNavigateMonth={navigateMonth}
                        isNextMonthFuture={isNextMonthFuture}
                    />
                );
            case 'analytics':
                if (!canAccessAnalytics) {
                    return <div className="text-center text-white p-8">Anda tidak memiliki akses ke Analytics</div>;
                }
                return <Analytics
                    allUsersData={props.allUsersData}
                    dailyActivitiesConfig={dailyActivitiesConfig}
                    onLoadAllData={props.onLoadEmployees}
                />;
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="border-b border-white/20">
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 -mb-px min-w-max">
                        {(!isAdministrativeAccount(employee.id) || isAnyAdmin(employee)) && <TabButton label="Kinerja" icon={BarChart3} active={activeTab === 'kinerja'} onClick={() => setActiveTab('kinerja')} />}
                        {(canAccessAnalytics || isAdministrativeAccount(employee.id) || isAnyAdmin(employee)) && <TabButton label="Analytics" icon={TrendingUp} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />}
                    </div>
                </div>
            </nav>
            <div className="mt-6">
                {renderContent()}
            </div>
            <ConfirmationModal
                isOpen={!!props.confirmDeleteTarget}
                onClose={() => props.setConfirmDeleteTarget?.(null)}
                onConfirm={() => props.handleDeleteTarget?.()}
                title="Hapus Target"
                message={<>Apakah Anda yakin ingin menghapus target &quot;<strong>{props.confirmDeleteTarget?.title}</strong>&quot;?</>}
                confirmText="Ya, Hapus"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
        </div>
    );
};

export default React.memo(MyDashboard);