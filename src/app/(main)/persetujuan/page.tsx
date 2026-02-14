'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MinimalistLoader from '@/components/ui/MinimalistLoader';

export default function PersetujuanRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = searchParams?.toString();
        const targetUrl = `/panel-mentor${params ? `?${params}` : ''}`;
        router.replace(targetUrl);
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
            <MinimalistLoader />
            <p className="mt-4 text-teal-400 font-medium animate-pulse">
                Memindahkan Anda ke Panel Supervisi...
            </p>
        </div>
    );
}
