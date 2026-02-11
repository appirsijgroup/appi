'use client';

import MainLayoutShell from '@/components/shared/MainLayoutShell';
import DataLoader from '@/components/ui/DataLoader';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DataLoader>
            <MainLayoutShell>{children}</MainLayoutShell>
        </DataLoader>
    );
}
