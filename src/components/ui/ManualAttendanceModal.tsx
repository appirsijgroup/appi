'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckBadgeIcon,
    UserGroupIcon,
    UserCircleIcon,
    ClockIcon,
    CheckIcon
} from '@/components/ui/Icons';
import type { Employee, TeamAttendanceSession } from '@/types';
import { useEmployeeStore } from '@/store/store';

// Helper for X mark icon since it might not be exported
const XMarkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

interface ManualAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: TeamAttendanceSession | null;
    onSave: (sessionId: string, presentUserIds: string[]) => Promise<void>;
}

export default function ManualAttendanceModal({ isOpen, onClose, session, onSave }: ManualAttendanceModalProps) {
    const { allUsersData } = useEmployeeStore();
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [initialSelectedUserIds, setInitialSelectedUserIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Initialize participants and existing attendance
    useEffect(() => {
        if (isOpen && session) {
            setSearchQuery('');
            const loadExisting = async () => {
                try {
                    // Import store dynamically to avoid hook rules issue if any, or standard way
                    const { useActivityStore } = await import('@/store/activityStore');
                    const records = await useActivityStore.getState().getAttendanceRecordsForSession(session.id);

                    const presentIds = new Set<string>();
                    records.forEach(r => {
                        if (r.userId) presentIds.add(r.userId);
                    });

                    setSelectedUserIds(presentIds);
                    setInitialSelectedUserIds(presentIds);
                } catch (e) {
                    console.error("Failed loading existing attendance", e);
                    setSelectedUserIds(new Set()); // Fallback clean
                    setInitialSelectedUserIds(new Set());
                }
            };
            loadExisting();
        }
    }, [isOpen, session]);

    // Get Employee objects for the participants
    const participants = React.useMemo(() => {
        if (!session || !session.manualParticipantIds) return [];

        const allEmployees = Object.values(allUsersData || {}).map((d: any) => d.employee as Employee);

        // Filter only those who were invited/added to this session
        return allEmployees.filter(emp => session.manualParticipantIds?.includes(emp.id));
    }, [allUsersData, session]);

    // Filter by Search
    const filteredParticipants = React.useMemo(() => {
        if (!searchQuery) return participants;
        const lower = searchQuery.toLowerCase();
        return participants.filter(p => p.name.toLowerCase().includes(lower) || (p.unit && p.unit.toLowerCase().includes(lower)));
    }, [participants, searchQuery]);

    const toggleUser = (userId: string) => {
        // 🔥 Prevent changing status of already saved records
        if (initialSelectedUserIds.has(userId)) return;

        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleAll = () => {
        // If query active, only toggle filtered ones
        const targets = filteredParticipants.map(p => p.id);

        // 🔥 Only toggleable targets (exclude already saved ones)
        const toggleableTargets = targets.filter(id => !initialSelectedUserIds.has(id));

        // Check if all TOGGLEABLE are selected
        const allToggleableSelected = toggleableTargets.every(id => selectedUserIds.has(id));

        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (allToggleableSelected) {
                // Unselect toggleable only
                toggleableTargets.forEach(id => next.delete(id));
            } else {
                // Add toggleable only
                toggleableTargets.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!session) return;
        setIsSaving(true);
        try {
            await onSave(session.id, Array.from(selectedUserIds));
            onClose();
        } catch (error) {
            console.error('Failed to save attendance:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const newAdditions = React.useMemo(() => {
        let count = 0;
        selectedUserIds.forEach(id => {
            if (!initialSelectedUserIds.has(id)) count++;
        });
        return count;
    }, [selectedUserIds, initialSelectedUserIds]);

    const hasChanges = newAdditions > 0;

    if (!isOpen || !session) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Panel */}
            <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/20 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckBadgeIcon className="w-6 h-6 text-teal-400" />
                            Input Presensi Manual
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                            <span className="bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded text-xs border border-teal-500/20">{session.type}</span>
                            <span>•</span>
                            <span>{new Date(session.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col min-h-0 grow overflow-hidden">

                    {/* Search & Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Cari nama peserta..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-black/30 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder:text-gray-600 focus:border-teal-500/50"
                            />
                        </div>
                        <button
                            onClick={toggleAll}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-teal-300 transition-colors shrink-0 flex items-center justify-center gap-2"
                        >
                            {filteredParticipants.every(p => selectedUserIds.has(p.id)) && filteredParticipants.length > 0
                                ? 'Batal Pilih Semua'
                                : 'Pilih Semua'
                            }
                        </button>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-2 px-1">
                        <span>Total Peserta: {filteredParticipants.length}</span>
                        <span className="text-teal-400 flex items-center gap-1">
                            <CheckIcon className="w-4 h-4" />
                            {selectedUserIds.size} Hadir
                        </span>
                    </div>

                    {/* List */}
                    <div className="grow overflow-y-auto pr-2 custom-scrollbar space-y-1 bg-black/20 rounded-xl p-2 border border-white/5">
                        {filteredParticipants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <UserGroupIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>Tidak ada peserta ditemukan</p>
                                <p className="text-xs opacity-50 mt-1">Coba kata kunci lain</p>
                            </div>
                        ) : (
                            filteredParticipants.map(p => {
                                const isSelected = selectedUserIds.has(p.id);
                                const isLocked = initialSelectedUserIds.has(p.id); // 🔥 Check lock status

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => toggleUser(p.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg transition-all border group ${isSelected
                                                ? 'bg-teal-500/10 border-teal-500/30'
                                                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                            } ${isLocked ? 'cursor-default opacity-75' : 'cursor-pointer'}`} // 🔥 Add visual cue
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${isSelected
                                                    ? isLocked
                                                        ? 'bg-teal-500/50 border-teal-500/50' // Muted for locked
                                                        : 'bg-teal-500 border-teal-500 shadow-lg shadow-teal-500/30 scale-110'
                                                    : 'border-gray-600 group-hover:border-gray-400'
                                                }`}>
                                                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white stroke-2" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                    {p.name}
                                                </p>
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1.5 truncate">
                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                                        {p.unit || 'Umum'}
                                                    </span>
                                                    {p.role && (
                                                        <span className="capitalize opacity-70">
                                                            {p.role.replace('-', ' ')}
                                                        </span>
                                                    )}
                                                    {isLocked && (
                                                        <span className="text-[9px] px-1 rounded bg-teal-500/20 text-teal-400 border border-teal-500/20 ml-1">
                                                            Terdata
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-black/30 rounded-b-2xl backdrop-blur-md">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-gray-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95 ${isSaving || !hasChanges
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none opacity-50'
                            : 'bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-teal-500/20'
                            }`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="w-5 h-5" />
                                {hasChanges ? `Simpan (${newAdditions} Baru)` : 'Data Tersimpan'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
