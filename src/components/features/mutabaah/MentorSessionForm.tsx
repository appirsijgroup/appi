'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarDaysIcon,
    ClockIcon,
    CheckIcon,
    UserCircleIcon,
    CheckBadgeIcon,
    UserGroupIcon,
    BuildingOffice2Icon
} from '@/components/ui/Icons';
import type { Employee, TeamAttendanceSession } from '@/types';
import { useRouter } from 'next/navigation';

type SmartSessionType =
    | 'KIE'
    | 'DOA BERSAMA'
    | 'BBQ'
    | 'UMUM';

interface MentorSessionFormProps {
    allUsers: Employee[];
    onCreateSessions: (sessions: Record<string, unknown>[]) => void;
    initialData?: TeamAttendanceSession | null;
    isEditing?: boolean;
    disabled?: boolean;
    loggedInEmployee?: Employee | null;
}

export const MentorSessionForm = ({
    allUsers,
    onCreateSessions,
    initialData,
    isEditing = false,
    disabled = false,
    loggedInEmployee,
}: MentorSessionFormProps) => {
    const router = useRouter();

    // 1. Determine User Role Capabilities
    const isSuperAdmin = loggedInEmployee?.role === 'super-admin' || loggedInEmployee?.role === 'admin'; // Admin/SuperAdmin gets full access
    const isMentor = loggedInEmployee?.canBeMentor || false;
    const isLeader = loggedInEmployee?.canBeKaUnit || loggedInEmployee?.canBeManager || loggedInEmployee?.canBeSupervisor || loggedInEmployee?.canBeDirut || false;

    // 2. Define Available Session Types based on Role
    const availableTypes = useMemo(() => {
        const types: SmartSessionType[] = [];

        // SUPER ADMIN / ADMIN -> ALL ACCESS
        if (isSuperAdmin) {
            return ['KIE', 'DOA BERSAMA', 'BBQ', 'UMUM'] as SmartSessionType[];
        }

        // KA UNIT / MANAGER / LEADER -> Doa Bersama, KIE
        if (isLeader) {
            types.push('DOA BERSAMA', 'KIE');
        }

        // MENTOR -> BBQ
        if (isMentor) {
            types.push('BBQ');
        }

        // Fallback or explicit additions (UMUM usually for everyone or admin, but let's keep it safe)
        // types.push('UMUM'); 

        // If no specific role detected but they have access, give minimum defaults
        if (types.length === 0) {
            types.push('KIE', 'DOA BERSAMA', 'BBQ');
        }

        // Remove duplicates if any
        return Array.from(new Set(types));
    }, [isMentor, isLeader, isSuperAdmin]);

    // Fields
    // Default type: First available type
    const [type, setType] = useState<SmartSessionType>(availableTypes[0] || 'KIE');
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    // Default mode: KIE/Doa (Leader) -> 'leader', BBQ (Mentor) -> 'leader' (usually verified by mentor)
    const [attendanceMode, setAttendanceMode] = useState<'leader' | 'self'>('leader');

    // Participants
    const [manualParticipants, setManualParticipants] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');

    // UI state
    const [error, setError] = useState('');

    // Update state when initialData changes or switching edit/create
    useEffect(() => {
        if (isEditing && initialData) {
            setType((initialData.type as SmartSessionType) || availableTypes[0]);
            setName(initialData.type.toUpperCase());
            setDate(initialData.date);
            setStartTime(initialData.startTime);
            setEndTime(initialData.endTime);
            setAttendanceMode(initialData.attendanceMode || 'leader');

            const participantIds = initialData.manualParticipantIds || [];
            setManualParticipants(new Set(participantIds));
        } else {
            // Reset to defaults
            // If type state is not in availableTypes (e.g. role changed), reset it
            if (!availableTypes.includes(type)) {
                setType(availableTypes[0]);
            }

            // Don't clear name if user is typing, only on mount
            if (!name) setName('');

            // Standard defaults
            // setDate(new Date().toISOString().split('T')[0]); // Keep existing selection if possible
            // setStartTime('08:00');
            // setEndTime('09:00');

            setAttendanceMode('leader');
        }
    }, [isEditing, initialData, availableTypes]); // Removed 'type', 'name' to prevent overwrite loop

    // Auto-fill name based on type
    useEffect(() => {
        if (!isEditing) {
            let defaultName = '';
            if (type === 'BBQ') defaultName = "Bimbingan Baca Al-Qur'an (BBQ)";
            else if (type === 'DOA BERSAMA') defaultName = "Doa Pagi Bersama";
            else if (type === 'KIE') defaultName = "KIE Unit Kerja";
            else if (type === 'UMUM') defaultName = "Tadarus Umum";

            setName(defaultName);
        }
    }, [isEditing, type]);

    // Calculate minimum allowed date
    const minDate = useMemo(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    }, []);

    // 3. Smart Participant Filtering Logic
    const { filteredParticipants, audienceLabel, selectAllLabel } = useMemo(() => {
        let candidates: Employee[] = [];
        let label = 'Peserta';
        let btnLabel = 'Pilih Semua';

        // SCENARIO 0: SUPER ADMIN / ADMIN -> ALL USERS
        if (isSuperAdmin) {
            candidates = allUsers; // All employees without filter
            label = 'Semua Pegawai';
            btnLabel = 'Pilih Semua Pegawai';
        }
        // SCENARIO A: MENTORING (BBQ)
        else if (type === 'BBQ') {
            label = 'Mentee (Binaan)';
            btnLabel = 'Pilih Semua Mentee';
            if (loggedInEmployee?.id) {
                candidates = allUsers.filter(u => u.mentorId === loggedInEmployee.id);
            }
        }
        // SCENARIO B: LEADERSHIP (KIE / DOA BERSAMA)
        else {
            label = 'Staf Unit / Bagian';
            btnLabel = 'Pilih Semua Staf';
            if (loggedInEmployee) {
                // Filter logic: Same Hospital AND (Same Unit OR Same Bagian)
                // Exclude self from the list usually
                candidates = allUsers.filter(u => {
                    if (u.id === loggedInEmployee.id) return false; // Don't include self

                    const sameHospital = u.hospitalId === loggedInEmployee.hospitalId;

                    // Strict hierarchy check if needed, but 'Same Unit' is usually sufficient for KaUnit
                    const sameUnit = u.unit && u.unit === loggedInEmployee.unit;
                    const sameBagian = u.bagian && u.bagian === loggedInEmployee.bagian;

                    return sameHospital && (sameUnit || sameBagian);
                });
            }
        }

        // Apply Search
        if (participantSearch) {
            const search = participantSearch.toLowerCase();
            candidates = candidates.filter(u => u.name.toLowerCase().includes(search) || u.id.includes(search));
        }

        return {
            filteredParticipants: candidates.sort((a, b) => a.name.localeCompare(b.name)),
            audienceLabel: label,
            selectAllLabel: btnLabel
        };
    }, [allUsers, type, loggedInEmployee, participantSearch, isSuperAdmin]);

    const handleParticipantToggle = (id: string) => {
        setManualParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSubmit = () => {
        setError('');

        if (!name.trim()) {
            setError('Nama kegiatan wajib diisi');
            return;
        }

        const selectedDate = new Date(date + 'T12:00:00');
        const today = new Date();
        const selectedMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();
        const currentMonth = today.getFullYear() * 12 + today.getMonth();

        if (selectedMonth < currentMonth) {
            setError('Tidak dapat membuat kegiatan untuk bulan yang sudah lewat');
            return;
        }

        if (startTime >= endTime) {
            setError('Waktu mulai harus sebelum waktu selesai');
            return;
        }

        if (manualParticipants.size === 0) {
            setError('Pilih setidaknya satu peserta');
            return;
        }

        const upperName = name.trim().toUpperCase();

        const dbTypeMapping: Record<string, string> = {
            'DOA BERSAMA': 'Doa Bersama',
            'KIE': 'KIE',
            'BBQ': 'BBQ',
            'UMUM': 'UMUM',
            'Kajian Selasa': 'Kajian Selasa',
        };

        const finalTypeForDb = dbTypeMapping[type] || type;

        const sessionData = {
            type: finalTypeForDb,
            startTime,
            endTime,
            attendanceMode,
            audienceType: 'manual',
            manualParticipantIds: Array.from(manualParticipants),
            date,
        };

        onCreateSessions([sessionData]);
    };

    // Helper Button Component
    const TypeButton = ({ t, active, onClick }: { t: SmartSessionType, active: boolean, onClick: () => void }) => {
        let label = t as string;
        let desc = '';
        if (t === 'BBQ') { label = 'BBQ'; desc = 'Bimbingan Quran'; }
        if (t === 'DOA BERSAMA') { label = 'Doa Pagi'; desc = 'Doa Bersama Unit'; }
        if (t === 'KIE') { label = 'KIE'; desc = 'Komunikasi & Edukasi'; }

        return (
            <button
                type="button"
                onClick={onClick}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${active
                    ? 'bg-teal-500/20 border-teal-400 shadow-lg scale-[1.02]'
                    : 'bg-black/20 border-gray-600 hover:border-gray-500 hover:bg-white/5 opacity-80 hover:opacity-100'}`}
            >
                <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-200'}`}>{label}</span>
                <span className={`text-[10px] ${active ? 'text-teal-200' : 'text-gray-400'}`}>{desc}</span>
            </button>
        );
    };

    const SegmentedControlButton = ({ label, icon: Icon, isActive, onClick }: any) => (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex items-center justify-center text-center gap-2 p-3 rounded-xl border-2 transition-all ${isActive ? 'bg-teal-500/20 border-teal-400 shadow-lg' : 'bg-black/20 border-gray-600 hover:border-gray-500 hover:bg-white/5'}`}
        >
            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-300' : 'text-gray-400'}`} />
            <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</span>
        </button>
    );

    return (
        <div className="bg-gray-800/40 sm:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 w-full border border-white/10 sm:border-white/20 flex flex-col max-w-2xl mx-auto">
            <div className="flex-1 flex flex-col min-h-0 space-y-6">

                {/* Header Section */}
                <div>
                    <h2 className="text-xl font-bold text-teal-300 mb-1">
                        Buat Sesi {type === 'BBQ' ? 'Mentoring' : 'Unit Kerja'}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {type === 'BBQ'
                            ? 'Buat jadwal bimbingan untuk mentee Anda.'
                            : 'Buat jadwal kegiatan untuk staf di unit Anda.'}
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Activity Type Selection - Only show if user has choices */}
                    {availableTypes.length > 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/20 p-2 rounded-xl">
                            {availableTypes.map(t => (
                                <TypeButton
                                    key={t}
                                    t={t}
                                    active={type === t}
                                    onClick={() => setType(t)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                        {/* Name Input */}
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-1">Nama Kegiatan</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={type === 'BBQ' ? "Contoh: Bimbingan Kelompok 1" : "Contoh: Doa Pagi Ruang Mawar"}
                                className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50 placeholder-gray-500"
                                disabled={disabled}
                            />
                        </div>

                        {/* Date Input */}
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-1">Tanggal</label>
                            <div className="relative">
                                <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={minDate}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                    style={{ colorScheme: 'dark' }}
                                    disabled={disabled}
                                />
                            </div>
                        </div>

                        {/* Time Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-1">Mulai</label>
                                <div className="relative">
                                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        style={{ colorScheme: 'dark' }}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-1">Selesai</label>
                                <div className="relative">
                                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-white/10 border border-white/30 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-teal-400 text-white disabled:opacity-50"
                                        style={{ colorScheme: 'dark' }}
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Attendance Mode */}
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-2">Mode Presensi</label>
                            <div className="flex gap-3">
                                <SegmentedControlButton
                                    label="Mandiri"
                                    icon={UserCircleIcon}
                                    isActive={attendanceMode === 'self'}
                                    onClick={() => !disabled && setAttendanceMode('self')}
                                />
                                <SegmentedControlButton
                                    label="Oleh Atasan"
                                    icon={CheckBadgeIcon}
                                    isActive={attendanceMode === 'leader'}
                                    onClick={() => !disabled && setAttendanceMode('leader')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Participants Selection */}
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex flex-col h-72">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                                {type === 'BBQ' ? <UserGroupIcon className="w-5 h-5" /> : <BuildingOffice2Icon className="w-5 h-5" />}
                                {audienceLabel}
                            </h4>
                            <span className="text-xs bg-teal-900/50 text-teal-200 px-2 py-1 rounded-full border border-teal-500/30">
                                {manualParticipants.size} terpilih
                            </span>
                        </div>

                        <div className="space-y-2 grow flex flex-col min-h-0">
                            {/* Select All Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    const newSet = new Set(manualParticipants);
                                    const allIds = filteredParticipants.map(u => u.id);
                                    const allSelected = allIds.length > 0 && allIds.every(id => newSet.has(id));

                                    if (allSelected) {
                                        // Deselect these candidates
                                        allIds.forEach(id => newSet.delete(id));
                                    } else {
                                        // Select these candidates
                                        allIds.forEach(id => newSet.add(id));
                                    }
                                    setManualParticipants(newSet);
                                }}
                                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 transition-colors flex items-center justify-center gap-2"
                                disabled={disabled}
                            >
                                <CheckBadgeIcon className="w-4 h-4" />
                                {(() => {
                                    const allIds = filteredParticipants.map(u => u.id);
                                    const selectedCount = allIds.filter(id => manualParticipants.has(id)).length;
                                    return selectedCount === allIds.length && allIds.length > 0
                                        ? 'Batalkan Semua Pilihan'
                                        : selectAllLabel;
                                })()}
                            </button>

                            <input
                                type="search"
                                value={participantSearch}
                                onChange={(e) => setParticipantSearch(e.target.value)}
                                placeholder={`Cari nama ${type === 'BBQ' ? 'mentee' : 'staf'}...`}
                                className="w-full bg-black/30 border border-white/20 rounded-lg p-2 text-sm text-white disabled:opacity-50"
                                disabled={disabled}
                            />

                            <div className="grow overflow-y-auto border border-white/10 rounded-lg p-2 bg-black/30 space-y-1 custom-scrollbar">
                                {filteredParticipants.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs text-center p-4">
                                        <UserGroupIcon className="w-8 h-8 mb-2 opacity-20" />
                                        <p>Tidak ada {audienceLabel.toLowerCase()} ditemukan.</p>
                                        <p className="mt-1 opacity-60">
                                            {type === 'BBQ'
                                                ? 'Pastikan data mentee sudah terhubung dengan akun Anda.'
                                                : 'Menampilkan staf di Unit/Bagian yang sama dengan Anda.'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredParticipants.map(user => (
                                        <label key={user.id} className={`flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition-colors ${manualParticipants.has(user.id) ? 'bg-teal-900/20' : ''} ${disabled && 'pointer-events-none opacity-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={manualParticipants.has(user.id)}
                                                onChange={() => handleParticipantToggle(user.id)}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                                                disabled={disabled}
                                            />
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${manualParticipants.has(user.id) ? 'text-teal-200' : 'text-gray-300'}`}>{user.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{user.unit || user.bagian || user.id}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm animate-pulse">
                        ⚠️ {error}
                    </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                        onClick={() => router.back()}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all disabled:opacity-50"
                        disabled={disabled}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        disabled={disabled}
                    >
                        {disabled ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5 shrink-0" />
                                <span>Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
