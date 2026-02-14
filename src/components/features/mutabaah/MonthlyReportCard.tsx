'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, PartyPopper, Sparkles, CheckCircle2 } from 'lucide-react';
import { DailyActivity } from '@/types';
import { getTodayLocalDateString } from '@/utils/dateUtils';
import { useUIStore, useAppDataStore } from '@/store/store';
import {
    getMonthlyReports,
    addManualReportByDate
} from '@/services/monthlyReportService';

interface MonthlyReportCardProps {
    activity: DailyActivity;
    employeeId: string;
    monthKey: string; // Format: "2026-01"
}

const motivationalMessages = [
    "Target bulan ini telah tercapai. Pertahankan konsistensi Anda dalam melaksanakan aktivitas ini.",
    "Anda telah memenuhi target laporan bulan ini. Kontribusi ini merupakan pencapaian yang baik.",
    "Target telah terpenuhi. Kedisiplinan Anda dalam pelaporan rutin sangat dihargai.",
    "Aktivitas bulan ini telah tuntas. Terus pertahankan performa kerja Anda."
];

const MonthlyReportCard: React.FC<MonthlyReportCardProps> = ({
    activity,
    employeeId,
    monthKey
}) => {
    const { addToast } = useUIStore();
    const { refreshActivityStats } = useAppDataStore();
    const [count, setCount] = useState<number>(0);
    const [reportedDates, setReportedDates] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDateString());
    const isSubmittingRef = React.useRef(false); // Prevent double submission

    // Load current data dari Database
    useEffect(() => {
        const loadData = async () => {
            const reports = await getMonthlyReports(employeeId);
            const activityData = reports[monthKey]?.[activity.id];

            // Get count from entries length or fallback to count field
            const entries = activityData?.entries || [];
            const currentCount = activityData?.count || entries.length || 0;

            setCount(currentCount);
            setReportedDates(entries.map((e: { date: string }) => e.date));
        };
        loadData();
    }, [employeeId, monthKey, activity.id]);

    const target = activity.monthlyTarget || 1;
    const isTargetMet = count >= target;
    const progress = Math.min((count / target) * 100, 100);

    // Check if selected date is already reported
    const isDateAlreadyReported = reportedDates.includes(selectedDate);

    const handleSubmit = async () => {
        if (isLoading || isSubmittingRef.current) return;

        // Validate: Check if date is already reported
        if (isDateAlreadyReported) {
            addToast(`⚠️ Aktivitas ini sudah dilaporkan untuk tanggal ${selectedDate}. Silakan pilih tanggal lain.`, 'error');
            return;
        }

        // 🔥 FIX: Validate if date is in current month (Locking)
        const today = new Date();
        const selectedDateObj = new Date(selectedDate);
        if (today.getMonth() !== selectedDateObj.getMonth() || today.getFullYear() !== selectedDateObj.getFullYear()) {
            addToast(`⚠️ Tidak dapat melaporkan aktivitas untuk bulan yang sudah terlewat. Periode pelaporan bulan lalu telah ditutup.`, 'error');
            return;
        }

        setIsLoading(true);
        isSubmittingRef.current = true;

        try {
            const result = await addManualReportByDate(
                employeeId,
                monthKey,
                activity.id,
                selectedDate
            );

            setCount(result.count);
            setReportedDates([...reportedDates, selectedDate]);

            // 🔥 NEW: Refresh activity stats to update dashboard chart
            refreshActivityStats();

            // Show success message
            addToast(`✅ ${activity.title} berhasil dilaporkan untuk tanggal ${selectedDate}!`, 'success');
        } catch (error) {
            console.error('❌ [MonthlyReportCard] Gagal menyimpan laporan:', error);

            // Show detailed error
            const errorMessage = error instanceof Error
                ? error.message
                : JSON.stringify(error);

            addToast(`❌ Gagal menyimpan: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleDecrement = async () => {
        if (isLoading || count === 0) {
            addToast('⚠️ Tidak bisa mengurangi laporan. Silakan hubungi admin untuk menghapus laporan.', 'error');
            return;
        }
        addToast('⚠️ Fitur pengurangan laporan belum tersedia. Silakan hubungi admin.', 'error');
    };

    const randomMessage = useMemo(() => {
        const seed = employeeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return motivationalMessages[seed % motivationalMessages.length];
    }, [employeeId]);

    return (
        <div className="border border-white/10 p-4 rounded-lg bg-linear-to-br from-gray-800/50 to-gray-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-base font-bold text-white mb-1">
                        {activity.title}
                    </h4>
                </div>

                {/* Status Badge */}
                {isTargetMet ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                            Tercapai!
                        </span>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-full">
                        <span className="text-xs font-semibold text-gray-400">
                            {count} / {target}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${isTargetMet
                            ? 'bg-linear-to-r from-green-500 to-emerald-500'
                            : 'bg-linear-to-r from-teal-500 to-blue-500'
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Progres</span>
                    <p className="text-xs text-gray-400 font-mono">
                        {progress.toFixed(0)}% tercapai
                    </p>
                </div>
            </div>

            {/* Achievement State or Input form */}
            {isTargetMet ? (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 text-center relative overflow-hidden">
                    <div className="flex justify-center mb-3">
                        <div className="p-2.5 bg-green-500/10 rounded-full">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <h5 className="text-sm font-bold text-green-400 mb-2">Target Tercapai</h5>
                    <p className="text-xs text-blue-100/70 leading-relaxed px-4">
                        {randomMessage}
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/60">Laporan Dikunci</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Date Picker */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            Tanggal Pelaporan:
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={getTodayLocalDateString()}
                            className={`w-full bg-white/5 border rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all ${isDateAlreadyReported
                                ? 'border-yellow-500/50 bg-yellow-500/10'
                                : 'border-white/20 focus:bg-white/10'
                                }`}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || isDateAlreadyReported}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold tracking-tight transition-all shadow-lg ${isLoading || isDateAlreadyReported
                            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border-gray-600/30'
                            : 'bg-linear-to-r from-teal-500/20 to-blue-500/20 hover:from-teal-500/30 hover:to-blue-500/30 text-teal-400 border border-teal-500/50 active:scale-95 shadow-teal-500/5'
                            }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                                <span>Menyimpan...</span>
                            </div>
                        ) : isDateAlreadyReported ? (
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                                <span>Sudah Dilaporkan</span>
                            </div>
                        ) : (
                            'Lapor Aktivitas'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MonthlyReportCard;
