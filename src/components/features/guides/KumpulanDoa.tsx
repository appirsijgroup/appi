'use client';

import React, { useMemo, useState } from 'react';
import { DailyPrayer } from '@/types';
import { KUMPULAN_DOA } from '@/constants/guides';
import { useUIStore } from '@/store/store';
import { ShareIcon } from '@/components/ui/Icons';
import { Copy, ChevronRight, Info, Star, ChevronLeft, Search } from 'lucide-react';

interface KumpulanDoaProps {
    searchQuery: string;
}

// Definisi Kategori - Menggunakan warna Indigo sesuai warna primer aplikasi
const CATEGORIES = [
    { id: 'sehari-hari', title: 'Doa Sehari-Hari', icon: 1, prayerIds: ['1', '2', '3', '4', '5', '6', '7', '13', '15', '16', '19', '20'] },
    { id: 'pilihan', title: 'Doa Pilihan', icon: 2, prayerIds: ['9', '14', '21'] },
    { id: 'sholawat', title: 'Doa Sholawat', icon: 3, prayerIds: [] },
    { id: 'para-nabi', title: 'Doa Para Nabi', icon: 4, prayerIds: [] },
    { id: 'quran-hadist', title: 'Doa Dari Qur\'an', icon: 5, prayerIds: [] },
    { id: 'seputar-sholat', title: 'Doa Seputar Sholat', icon: 6, prayerIds: ['10', '11', '12', '17', '18'] },
    { id: 'seputar-jenazah', title: 'Doa Seputar Jenazah', icon: 7, prayerIds: [] },
    { id: 'ramadhan-haji', title: 'Doa Ramadhan & Haji', icon: 8, prayerIds: [] },
    { id: 'lainnya', title: 'Doa Lainnya', icon: 9, prayerIds: ['8'] },
];

const KumpulanDoa: React.FC<KumpulanDoaProps> = ({ searchQuery }) => {
    const { openShareModal, addToast } = useUIStore();

    // Navigation State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [expandedPrayerId, setExpandedPrayerId] = useState<string | null>(null);

    const handleCopy = (doa: DailyPrayer, e: React.MouseEvent) => {
        e.stopPropagation();
        const textToCopy = `${doa.title}\n\n${doa.arabic}\n\n${doa.latin}\n\n"${doa.translation}"`;
        navigator.clipboard.writeText(textToCopy);
        addToast('Teks doa berhasil disalin!', 'success');
    };

    const handleShare = (doa: DailyPrayer, e: React.MouseEvent) => {
        e.stopPropagation();
        openShareModal('doa', doa);
    };

    const filteredDoaList = useMemo(() => {
        const category = CATEGORIES.find(c => c.id === selectedCategoryId);
        if (!category) return [];
        return KUMPULAN_DOA.filter(doa => category.prayerIds.includes(doa.id));
    }, [selectedCategoryId]);

    const searchResults = useMemo(() => {
        if (!searchQuery) return null;
        const lowercasedQuery = searchQuery.toLowerCase();
        return KUMPULAN_DOA.filter((doa: DailyPrayer) =>
            doa.title.toLowerCase().includes(lowercasedQuery) ||
            doa.latin.toLowerCase().includes(lowercasedQuery) ||
            doa.translation.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery]);

    // UI Render for Search
    if (searchQuery) {
        return (
            <div className="max-w-6xl mx-auto px-4 pb-40">
                <div className="flex items-center gap-3 mb-8 opacity-60">
                    <Search className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-white font-bold uppercase tracking-widest text-xs">Pencarian: {searchQuery}</h3>
                </div>
                {searchResults && searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map(doa => (
                            <PrayerListItem
                                key={doa.id}
                                doa={doa}
                                isExpanded={expandedPrayerId === doa.id}
                                onToggle={() => setExpandedPrayerId(expandedPrayerId === doa.id ? null : doa.id)}
                                onCopy={handleCopy}
                                onShare={handleShare}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-indigo-950/20 rounded-3xl border border-white/5">
                        <Info className="w-12 h-12 text-white/5 mx-auto mb-4" />
                        <p className="text-white/20 italic text-sm">Doa tidak ditemukan...</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 pb-40">
            {/* NAVIGATION LOGIC */}
            <div className="animate-in fade-in duration-700">
                {!selectedCategoryId ? (
                    /* MENU UTAMA - Lebih Kompak & Rapi */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CATEGORIES.map((cat, idx) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                style={{ animationDelay: `${idx * 40}ms` }}
                                className="group h-24 flex items-center bg-indigo-950/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-1 transition-all animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                            >
                                <div className="w-20 h-full bg-indigo-600 flex items-center justify-center shrink-0">
                                    <div className="absolute w-8 h-8 rotate-45 border-2 border-white/20 rounded-md group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="relative text-lg font-black text-white italic">{cat.icon}</span>
                                </div>
                                <div className="grow px-6 text-left">
                                    <h4 className="text-lg font-bold text-white tracking-tight leading-tight transition-colors group-hover:text-indigo-400">
                                        {cat.title}
                                    </h4>
                                </div>
                                <div className="pr-6 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* DAFTAR DOA - Menggunakan Grid 2 Kolom untuk Efisiensi Ruang */
                    <div className="space-y-6">
                        <header className="flex items-center gap-4 mb-4">
                            <button
                                onClick={() => { setSelectedCategoryId(null); setExpandedPrayerId(null); }}
                                className="p-3 rounded-xl bg-white/5 border border-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-90"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="text-xl font-bold text-white tracking-tight">
                                {CATEGORIES.find(c => c.id === selectedCategoryId)?.title}
                            </h3>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                            {filteredDoaList.length > 0 ? (
                                filteredDoaList.map(doa => (
                                    <PrayerListItem
                                        key={doa.id}
                                        doa={doa}
                                        isExpanded={expandedPrayerId === doa.id}
                                        onToggle={() => setExpandedPrayerId(expandedPrayerId === doa.id ? null : doa.id)}
                                        onCopy={handleCopy}
                                        onShare={handleShare}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center opacity-20 italic text-white text-sm">
                                    Belum ada doa di kategori ini...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component Item Doa - Dibuat Lebih Kompak & Rapi
const PrayerListItem = ({ doa, isExpanded, onToggle, onCopy, onShare }: any) => (
    <div className={`group transition-all duration-500 overflow-hidden ${isExpanded
        ? 'bg-indigo-900/40 backdrop-blur-xl border border-indigo-500/30 rounded-4xl shadow-2xl mb-4 col-span-full'
        : 'bg-indigo-950/40 backdrop-blur-md rounded-xl shadow-sm border border-white/5 hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5'
        }`}>
        <button
            onClick={onToggle}
            className="w-full text-left p-5 sm:p-6 flex items-center justify-between"
        >
            <h4 className={`text-base font-black tracking-tight transition-colors ${isExpanded ? 'text-teal-400' : 'text-white'}`}>
                {doa.title}
            </h4>
            <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-90 text-teal-400' : 'text-indigo-300'}`}>
                <ChevronRight className="w-5 h-5" />
            </div>
        </button>

        {isExpanded && (
            <div className="px-6 sm:px-10 pb-10 space-y-8 animate-in slide-in-from-top-2 duration-500">
                <div className="relative py-8 px-6 rounded-2xl bg-indigo-950/60 border border-white/5 shadow-inner">
                    <p dir="rtl" className="text-right text-white font-serif leading-[2.4] select-all text-4xl sm:text-5xl drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                        {doa.arabic}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left border-t border-white/10 pt-8">
                    <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Transliterasi</h5>
                        <p className="text-xl text-white font-bold italic leading-relaxed drop-shadow-sm">{doa.latin}</p>
                    </div>
                    <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Terjemahan</h5>
                        <p className="text-base text-blue-50 font-medium italic leading-relaxed">&quot;{doa.translation}&quot;</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                    <button onClick={(e) => onCopy(doa, e)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-teal-500 text-teal-300 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-teal-500/20">
                        <Copy className="w-3.5 h-3.5" />
                        Salin
                    </button>
                    <button onClick={(e) => onShare(doa, e)} className="p-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white transition-all border border-indigo-500/20">
                        <ShareIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
    </div>
);

export default KumpulanDoa;