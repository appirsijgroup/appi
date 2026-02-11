'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MonthlyActivities from '@/components/features/mutabaah/MonthlyActivities';
import { useAuthStore, useEmployeeStore, useDailyActivitiesStore, useUIStore } from '@/store/store';
import { useMutabaahStore } from '@/store/mutabaahStore';
import MinimalistLoader from '@/components/ui/MinimalistLoader';
import { submitMonthlyReport as submitReport, hasSubmittedReport, type MonthlyReportSubmissionPayload } from '@/services/monthlySubmissionService';
import { getAllEmployees } from '@/services/employeeService';

export default function AktivitasBulananPage() {
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const { addToast } = useUIStore();
    const { mutabaahLockingMode, load } = useMutabaahStore();
    const { loggedInEmployee } = useAuthStore();
    const { loadDetailedEmployeeData, allUsersData } = useEmployeeStore();
    const [date, setDate] = useState<Date>(new Date());
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    const {
        isCurrentMonthActivated,
        monthlyProgressData,
        activateMonth,
        updateMonthlyProgress,
        monthlyReportSubmissions,
        setMonthlyReportSubmissions,
        refreshData,
        isLoading,
    } = useMutabaahStore();

    // 🔥 FIX: Move useMemo BEFORE conditional returns to avoid hooks order issue
    const enrichedMonthlyProgressData = useMemo(() => {
        // High fidelity source: store's loggedInEmployee.monthlyActivities
        // This is pre-loaded via loadDetailedEmployeeData in Dashboard
        return loggedInEmployee?.monthlyActivities || monthlyProgressData || {};
    }, [loggedInEmployee?.monthlyActivities, monthlyProgressData]);

    // Employee activation status log removed

    // 🔥 FIX: Load mutabaah locking mode from Database on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                await load();
            } catch (error) {
            }
        };
        loadSettings();
    }, [load]);

    // 🔥 FIX: Refresh all mutabaah data (including report submissions) on mount
    useEffect(() => {
        if (loggedInEmployee?.id) {
            refreshData().catch(err => console.error('Failed to refresh mutabaah data:', err));
        }
    }, [loggedInEmployee?.id, refreshData]);

    const handleUpdateMonthlyActivities = async (userId: string, monthKey: string, monthProgress: any) => {
        // 🔥 FIX: BERSIHKAN data sebelum disimpan!
        // Filter out any foreign fields from monthProgress
        const cleanedMonthProgress: any = {};
        Object.keys(monthProgress).forEach(key => {
            // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
            if (key.match(/^\d{2}$/)) {
                cleanedMonthProgress[key] = monthProgress[key];
            }
            // Field asing (kie, doaBersama, dll) akan DIHAPUS!
        });

        // Update via Database using context
        const success = await updateMonthlyProgress(monthKey, cleanedMonthProgress);
        if (!success) {
            // Fallback to localStorage if needed
            // Anda bisa menambahkan logic fallback di sini jika diperlukan
        }
    };

    const handleActivateMonth = async (userId: string, monthKey: string) => {
        // Activate via Database using context
        // userId parameter is provided by the component but not used since context has access to employee
        const success = await activateMonth(monthKey);
        if (!success) {
        } else {
            // 🔥 CRITICAL FIX: Refresh data after successful activation to ensure UI updates immediately
            // This ensures that the activation status propagates to all components that depend on it
            await refreshData();
        }
    };

    const handleSubmitReport = async (monthKey: string) => {
        if (!loggedInEmployee) {
            addToast('User tidak ditemukan', 'error');
            return;
        }

        try {
            // Check if already submitted
            const alreadySubmitted = await hasSubmittedReport(
                loggedInEmployee.id,
                monthKey
            );

            if (alreadySubmitted) {
                addToast('Laporan untuk bulan ini sudah dikirim.', 'error');
                return;
            }

            const submissionPayload: MonthlyReportSubmissionPayload = {
                content: monthlyProgressData[monthKey] || {},
                menteeName: (loggedInEmployee as any).name || '',
                mentorId: (loggedInEmployee as any).mentorId || '',
                kaUnitId: (loggedInEmployee as any).kaUnitId || '',
                hospitalId: (loggedInEmployee as any).hospitalId || '',
                unit: (loggedInEmployee as any).unit || '',
                bagian: (loggedInEmployee as any).bagian || ''
            };

            const result = await submitReport(
                loggedInEmployee.id,
                monthKey,
                submissionPayload
            );

            if (result) {
                // 🔥 AGGRESSIVE UPDATE: Update local store immediately for instant UI feedback
                // monthlyReportSubmissions is already accessible here from the destructured store
                setMonthlyReportSubmissions([...monthlyReportSubmissions, result]);

                addToast('Laporan bulanan berhasil dikirim!', 'success');
                // Refresh data to update the UI from server as well
                await refreshData();
            }
        } catch (error: any) {
            console.error('Submission error:', error);
            addToast(error.message || 'Gagal mengirim laporan. Silakan coba lagi.', 'error');
        }
    };

    // Conditional renders MUST be AFTER all hooks
    if (!loggedInEmployee || isLoading) {
        return <MinimalistLoader message="Memuat data mutabaah..." />;
    }

    if (isLoadingEmployees) {
        return <MinimalistLoader message="Memuat data karyawan..." />;
    }

    return (
        <MonthlyActivities
            employee={loggedInEmployee}
            allUsers={Object.values(allUsersData).map(data => data.employee)}
            monthlyProgressData={enrichedMonthlyProgressData}
            onUpdate={handleUpdateMonthlyActivities}
            onActivateMonth={handleActivateMonth}
            monthlyReportSubmissions={monthlyReportSubmissions}
            onSubmitReport={handleSubmitReport}
            date={date}
            onDateChange={setDate}
            dailyActivitiesConfig={dailyActivitiesConfig}
            mutabaahLockingMode={mutabaahLockingMode}
        />
    );
}
