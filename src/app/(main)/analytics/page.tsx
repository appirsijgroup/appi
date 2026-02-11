'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEmployeeStore, useDailyActivitiesStore } from '@/store/store';
import MinimalistLoader from '@/components/ui/MinimalistLoader';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/features/admin/Analytics'), {
    loading: () => <MinimalistLoader message="Memuat grafik..." />,
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData, loadAllEmployees } = useEmployeeStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 🔥 OPTIMIZATION: Use background loading - don't block component mounting
    useEffect(() => {
        // Just trigger the load, don't await it here if we want to show component-level loaders
        loadAllEmployees().catch((err: unknown) => {
            console.error('📊 [AnalyticsPage] Background data load failed:', err);
            // Check fresh state directly to avoid dependency cycle
            if (Object.keys(useEmployeeStore.getState().allUsersData).length === 0) {
                setError('Gagal memuat data pendukung. Silakan periksa koneksi Anda.');
            }
        });

        // We can stop our main page loader immediately to show the Analytics UI shell
        setIsLoading(false);
    }, [loadAllEmployees]);

    // Show loading state
    if (isLoading) {
        return <MinimalistLoader message="" />;
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
                    <p className="text-white mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    // Show analytics if not loading and no error
    return <Analytics
        allUsersData={allUsersData}
        dailyActivitiesConfig={dailyActivitiesConfig}
        onLoadAllData={() => loadAllEmployees()} // No limit = load all
    />;
}
