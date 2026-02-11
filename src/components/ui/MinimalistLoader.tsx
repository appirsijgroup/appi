'use client';

import React from 'react';

/**
 * MinimalistLoader - Premium Indigo Styled Spinner
 * Used for elegant transitions between app states.
 */
export const MinimalistLoader: React.FC<{ message?: string; fullScreen?: boolean }> = ({ message = 'Menyeimbangkan sanad...', fullScreen = false }) => {
    const content = (
        <div className={`flex flex-col items-center justify-center p-12 sm:p-20 ${!fullScreen ? 'bg-indigo-950/20 backdrop-blur-md rounded-[3rem] border border-white/10 shadow-2xl' : ''} animate-in fade-in duration-700`}>
            <div className="relative w-16 h-16 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
            </div>
            {message && (
                <p className="text-indigo-200 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse text-center">
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-indigo-950/30 backdrop-blur-xl">
                {content}
            </div>
        );
    }

    return content;
};

export default MinimalistLoader;
