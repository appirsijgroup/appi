'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/store/store';
import BrandedLoader from '@/components/ui/BrandedLoader';

/**
 * GlobalLoadingOverlay - Melayani loading state yang bersifat global
 * Menggunakan state dari useUIStore untuk menampilkan loader yang konsisten
 * di seluruh aplikasi, terutama saat transisi login atau persiapan session.
 */
export const GlobalLoadingOverlay: React.FC = () => {
    const { globalLoading } = useUIStore();
    const [isVisible, setIsVisible] = useState(false);

    // Track active state to prevent "blink" during internal state updates
    useEffect(() => {
        if (globalLoading.show) {
            setIsVisible(true);
        } else {
            // Snappier transition cleanup
            const timer = setTimeout(() => setIsVisible(false), 100);
            return () => clearTimeout(timer);
        }
    }, [globalLoading.show]);

    if (!isVisible && !globalLoading.show) return null;

    return (
        <div
            className={`
                fixed inset-0 z-10000 transition-opacity duration-200
                ${globalLoading.show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                bg-linear-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]
            `}
        >
            <BrandedLoader
                fullScreen={true}
                message={globalLoading.message}
            />
        </div>
    );
};

export default GlobalLoadingOverlay;
