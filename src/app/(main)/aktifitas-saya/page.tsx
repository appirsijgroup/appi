'use client';

import dynamic from 'next/dynamic';

import MinimalistLoader from '@/components/ui/MinimalistLoader';

// ⚡ LAZY LOADING: AktivitasSayaContainer will only load when user visits /aktifitas-saya
const AktivitasSayaContainer = dynamic(() => import('@/components/features/activities/AktivitasSayaContainer'), {
    loading: () => <MinimalistLoader message="Memuat Aktivitas..." />,
    ssr: false // Disable SSR for this client component
});

export default function AktifitasSayaPage() {
    return <AktivitasSayaContainer />;
}