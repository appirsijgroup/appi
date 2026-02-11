'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PRAYER_GUIDES } from '@/constants/guides';
import type { PrayerGuide, GuideStep } from '@/types';
import {
    MosqueIcon,
    SparklesIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    XMarkIcon,
    BookOpenIcon,
    FastingIcon
} from '@/components/ui/Icons';
import { useUIStore } from '@/store/store';
import { FileText, Bookmark, Printer, Share2, BookOpen, Quote, ChevronRight } from 'lucide-react';

interface PanduanSholatProps {
    searchQuery: string;
}

/**
 * GuideKitabView: Tampilan ala Kitab/Buku Profesional
 * Fokus pada proporsi tipografi yang elegan dan susunan yang rapi.
 */
const GuideKitabView: React.FC<{ guide: PrayerGuide; onBack: () => void }> = ({ guide, onBack }) => {
    const { openShareModal } = useUIStore();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [guide.id]);

    return (
        <div className="min-h-screen bg-[#f1f3f1] py-8 sm:py-16 px-4 selection:bg-[#dce9d5]">
            {/* Tool Bar - Focused on utility with soft colors */}
            <div className="max-w-5xl mx-auto mb-10 flex items-center justify-between border-b border-black/10 pb-4 px-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-black text-[#5a6e5a] hover:text-[#2d3a2d] transition-colors uppercase tracking-[0.2em]"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Kembali
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="p-2 text-[#5a6e5a] hover:text-[#2d3a2d] transition-colors"
                        title="Cetak"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => openShareModal('doa', guide)}
                        className="p-2 text-[#5a6e5a] hover:text-[#2d3a2d] transition-colors"
                        title="Bagikan"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Reading Document Body - High Quality Paper Feel */}
            <article className="max-w-5xl mx-auto bg-[#fffdfa] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] rounded-sm border border-[#e5e1d5] overflow-hidden animate-view-change">

                {/* Book Jacket / Library Header */}
                <div className="pt-10 pb-8 px-10 sm:px-20 text-center border-b border-[#f0ede4] bg-[#faf9f6]">
                    <div className="text-[10px] font-black text-[#4a634a] uppercase tracking-[0.4em] mb-4">
                        PERPUSTAKAAN DIGITAL RSI GROUP
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-serif font-black text-[#1a2b1a] mb-4 leading-tight tracking-tight">
                        {guide.title}
                    </h1>

                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-px w-12 bg-[#4a634a]/20" />
                        <BookOpen className="w-4 h-4 text-[#4a634a]/30" />
                        <div className="h-px w-12 bg-[#4a634a]/20" />
                    </div>

                    <p className="max-w-2xl mx-auto text-lg text-[#4a634a] font-serif leading-relaxed italic">
                        {guide.description}
                    </p>
                </div>

                {/* Content Sections - Standardized Vertical Flow */}
                <div className="px-6 sm:px-20 py-10 bg-white">
                    <div className="space-y-20">
                        {guide.steps.map((step, index) => (
                            <section key={step.id} className="relative">
                                <div className="space-y-8">
                                    {/* Chapter / Step Header */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-px bg-[#4a634a]/10" />
                                        <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2d3a2d] whitespace-nowrap">
                                            {String(index + 1).padStart(2, '0')}. {step.title}
                                        </h3>
                                        <div className="h-px flex-1 bg-black/5" />
                                    </div>

                                    <div className="space-y-8">
                                        {/* Commentary / Description */}
                                        {step.description && (
                                            <p className="text-base text-[#4a5a4a] leading-relaxed font-serif italic max-w-4xl border-l-4 border-[#4a634a]/5 pl-6">
                                                {step.description}
                                            </p>
                                        )}

                                        {/* Sacred Reading Content */}
                                        {step.arabic && (
                                            <div className="space-y-4">
                                                {/* Arabic Container */}
                                                <div className="py-6 px-6 rounded-xl bg-[#f8f7f2] border border-[#e8e6dc] shadow-inner">
                                                    <p dir="rtl" className="text-3xl sm:text-4xl text-right text-[#1a2b1a] font-serif leading-[1.8] select-all">
                                                        {step.arabic}
                                                    </p>
                                                </div>

                                                {/* Transliteration & Translation */}
                                                <div className="space-y-2 max-w-4xl mx-auto">
                                                    <p className="text-[#3a5a3a] font-serif text-lg font-black leading-relaxed italic text-center px-4">
                                                        {step.latin}
                                                    </p>

                                                    <div className="relative pt-3">
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-black/5" />
                                                        <p className="text-[#5a6e5a] text-base leading-relaxed font-serif italic text-center px-8">
                                                            &quot;{step.translation}&quot;
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>

                {/* Colophon / Closing */}
                <div className="bg-[#faf9f6] p-16 text-center border-t border-[#f0ede4] mt-12">
                    <div className="inline-block p-4 rounded-2xl bg-white border border-[#e5e1d5] shadow-sm mb-6">
                        <CheckCircleIcon className="w-8 h-8 text-[#4a634a]/40" />
                    </div>
                    <p className="text-sm text-[#4a634a] font-serif italic">
                        Semoga Allah Subhanahu Wa Ta'ala Memberkahi Ibadah Anda
                    </p>
                </div>
            </article>

            {/* Library Footer */}
            <footer className="max-w-5xl mx-auto mt-20 mb-24 px-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                <button
                    onClick={onBack}
                    className="text-[10px] font-black uppercase tracking-[0.4em] text-[#4a634a] hover:text-[#1a211a] transition-colors"
                >
                    TUTUP PANDUAN
                </button>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-right text-[#4a634a]">
                    RSIJ GROUP DIGITAL LIBRARY • EDISI KHUSUS
                </div>
            </footer>
        </div>
    );
};

const GuideCard: React.FC<{ guide: PrayerGuide; onSelect: () => void; icon: React.ReactNode; color: string }> = ({ guide, onSelect, color }) => (
    <button
        onClick={onSelect}
        className="group relative p-8 rounded-4xl border border-white/10 bg-indigo-950/40 backdrop-blur-md hover:bg-indigo-900/60 transition-all duration-500 text-left flex flex-col gap-4 h-full overflow-hidden shadow-xl hover:-translate-y-1 hover:border-indigo-500/30"
    >
        {/* Simple Content Section */}
        <div className="relative z-10">
            <h3 className="font-black text-2xl text-white group-hover:text-teal-400 transition-colors duration-300">
                {guide.title}
            </h3>
        </div>

        <div className="relative z-10 flex-1">
            <p className="text-blue-100/80 text-base leading-relaxed line-clamp-2 font-medium">
                {guide.description}
            </p>
        </div>

        {/* Action Label */}
        <div className="relative z-10 pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-teal-400 transition-colors`}>
                Buka Panduan
            </span>
            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-teal-400 transition-all group-hover:translate-x-1" />
        </div>
    </button>
);

const PanduanSholat: React.FC<PanduanSholatProps> = ({ searchQuery }) => {
    const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

    const selectedGuide = useMemo(() => {
        if (!selectedGuideId) return null;
        return PRAYER_GUIDES.find(g => g.id === selectedGuideId) ?? null;
    }, [selectedGuideId]);

    const filteredGuides = useMemo(() => {
        if (!searchQuery) {
            return PRAYER_GUIDES;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return PRAYER_GUIDES.filter(guide =>
            guide.title.toLowerCase().includes(lowercasedQuery) ||
            guide.description.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery]);

    const sections = useMemo(() => {
        return [
            { title: 'Sholat Fardhu', ids: ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'], icon: <MosqueIcon className="w-7 h-7" />, color: 'teal' },
            { title: 'Sholat Jenazah', ids: ['jenazah-laki', 'jenazah-perempuan', 'jenazah-anak-laki', 'jenazah-anak-perempuan'], icon: <BookOpenIcon className="w-7 h-7" />, color: 'amber' },
            { title: 'Sholat Sunnah', ids: ['dhuha', 'gerhana', 'tahajud', 'idul_fitri', 'idul_adha'], icon: <SparklesIcon className="w-7 h-7" />, color: 'indigo' }
        ].map(s => ({ ...s, guides: filteredGuides.filter(g => s.ids.includes(g.id)) })).filter(s => s.guides.length > 0);
    }, [filteredGuides]);

    if (selectedGuide) {
        return <GuideKitabView guide={selectedGuide} onBack={() => setSelectedGuideId(null)} />;
    }

    if (filteredGuides.length === 0 && searchQuery) {
        return (
            <div className="text-center py-24 animate-in fade-in duration-500">
                <Bookmark className="w-12 h-12 text-teal-500/20 mx-auto mb-6" />
                <p className="text-2xl font-black text-white mb-2">Tidak ditemukan</p>
                <p className="text-blue-100/60 text-sm">Gunakan kata kunci lain.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-20 animate-in fade-in duration-1000 pb-20">
            {sections.map((section, sIdx) => (
                <section key={section.title} style={{ animationDelay: `${sIdx * 100}ms` }} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
                    <div className="flex items-center gap-3 mb-8 px-2 opacity-80">
                        <div className={`w-2 h-8 bg-${section.color}-500 rounded-full shadow-lg shadow-${section.color}-500/30`} />
                        <div className="space-y-0.5">
                            <h3 className="text-xl font-black text-white tracking-widest uppercase">{section.title}</h3>
                            <div className="h-0.5 w-12 bg-white/10 rounded-full" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                        {section.guides.map(guide =>
                            <GuideCard
                                key={guide.id}
                                guide={guide}
                                onSelect={() => setSelectedGuideId(guide.id)}
                                icon={section.icon}
                                color={section.color}
                            />
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default PanduanSholat;
