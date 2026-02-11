'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import PrayerCard, { PrayerCardSkeleton } from '@/components/features/attendance/PrayerCard';
import { PRAYERS } from '@/constants/prayers';
import { fetchPrayerTimes, type PrayerTimesData } from '@/services/prayerTimeService';
import { submitAttendance, getEmployeeAttendance } from '@/services/attendanceService';
import { submitScheduledAttendance, getEmployeeActivitiesAttendance } from '@/services/scheduledActivityService';
import { createTeamAttendanceRecord, getAllTeamAttendanceRecordsForUser } from '@/services/teamAttendanceService';
import { getTodayLocalDateString, getCurrentTime } from '@/utils/dateUtils';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useNotificationStore } from '@/store/notificationStore';
import { UnifiedManualRequestModal } from '@/components/features/mutabaah/UnifiedManualRequestModal';
import { isAnyAdmin } from '@/lib/rolePermissions';
import { timeValidationService } from '@/services/timeValidationService';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Video,
  Youtube,
  Check,
  X,
  Pencil,
  Users,
  LayoutGrid,
  ListIcon,
  ChevronRight,
  Info,
  PlusCircle,
  TrendingUp,
  History
} from 'lucide-react';
import type { Activity, TeamAttendanceSession, Attendance, AttendanceStatus, TadarusRequest, MissedPrayerRequest, Employee } from '@/types';

// Helper to check if employee matches rules
const doesEmployeeMatchRules = (employee: any, rules: any): boolean => {
  if (!rules) return true;
  if (rules.hospitalIds && rules.hospitalIds.length > 0 && !rules.hospitalIds.includes(employee.hospitalId || '')) return false;
  if (rules.units && rules.units.length > 0 && !rules.units.includes(employee.unit)) return false;
  if (rules.bagians && rules.bagians.length > 0 && !rules.bagians.includes(employee.bagian)) return false;
  if (rules.professionCategories && rules.professionCategories.length > 0 && !rules.professionCategories.includes(employee.professionCategory)) return false;
  if (rules.professions && rules.professions.length > 0 && !rules.professions.includes(employee.profession)) return false;
  return true;
};

const PresensiComponent: React.FC = () => {
  const { loggedInEmployee, allUsersData, setAllUsersData, setLoggedInEmployee, refreshActivityStats } = useAppDataStore();
  const { activities, teamAttendanceSessions, teamAttendanceRecords, loadActivities, loadTeamAttendanceSessions } = useActivityStore();
  const { addOrUpdateTadarusRequest, addOrUpdateMissedPrayerRequest } = useGuidanceStore();
  const { createNotification } = useNotificationStore();
  const { addToast } = useUIStore();

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);
  const [activePrayerId, setActivePrayerId] = useState<string | null>(null);
  const [activityAttendance, setActivityAttendance] = useState<Attendance>({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(() => {
    // 🔥 Optimization: Instant feel if store already has data
    const store = useActivityStore.getState();
    return store.activities.length === 0 && store.teamAttendanceSessions.length === 0;
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
    isLateEntry: boolean;
    type: 'prayer' | 'activity';
  }>({
    isOpen: false,
    entityId: '',
    entityName: '',
    isLateEntry: false,
    type: 'prayer'
  });

  const [isManualRequestModalOpen, setIsManualRequestModalOpen] = useState(false);

  // Load everything on mount
  useEffect(() => {
    const initData = async () => {
      if (!loggedInEmployee?.id) return;

      try {
        const prayerAtt = await getEmployeeAttendance(loggedInEmployee.id);
        await Promise.all([
          loadActivities(loggedInEmployee.id),
          loadTeamAttendanceSessions()
        ]);

        const actAtt = await getEmployeeActivitiesAttendance(loggedInEmployee.id);
        const teamRecords = await getAllTeamAttendanceRecordsForUser(loggedInEmployee.id);
        const convertedAtt: Attendance = {};

        Object.entries(actAtt).forEach(([key, record]) => {
          convertedAtt[key] = {
            status: record.status as 'hadir' | 'tidak-hadir' | null,
            submitted: true,
            isLateEntry: record.isLateEntry,
            timestamp: Date.now()
          };
        });

        teamRecords.forEach(record => {
          convertedAtt[`team-${record.sessionId}`] = {
            status: 'hadir',
            submitted: true,
            timestamp: record.attendedAt
          };
        });

        setActivityAttendance(convertedAtt);
        setIsLoadingActivities(false);

        setAllUsersData((prev: any) => {
          const newState = { ...prev };
          if (!newState[loggedInEmployee.id]) {
            newState[loggedInEmployee.id] = { employee: loggedInEmployee, attendance: {}, history: {} };
          }
          newState[loggedInEmployee.id] = {
            ...newState[loggedInEmployee.id],
            attendance: prayerAtt
          };
          return newState;
        });

      } catch (error) {
        console.error('Error initializing daily attendance:', error);
      }
    };
    initData();
  }, [loggedInEmployee, loadActivities, loadTeamAttendanceSessions, setAllUsersData]);

  useEffect(() => {
    const loadPrayerTimes = async () => {
      if (!loggedInEmployee) return;
      const locationId = '1301'; // Jakarta Default
      const d = new Date();
      const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      try {
        const times = await fetchPrayerTimes(locationId, today);
        setPrayerTimes(times);
      } catch (error) {
        setPrayerTimes(null);
      } finally {
        setPrayerTimesLoading(false);
      }
    };
    loadPrayerTimes();
  }, [loggedInEmployee]);

  const todaySchedule = useMemo(() => {
    const todayStr = getTodayLocalDateString();
    const regularActivities = activities
      .filter(act => act.date === todayStr)
      .map(act => ({
        id: act.id,
        name: act.name,
        startTime: act.startTime,
        endTime: act.endTime,
        isTeamSession: false,
        zoomUrl: act.zoomUrl,
        youtubeUrl: act.youtubeUrl,
        status: act.status,
        audienceType: act.audienceType,
        participantIds: act.participantIds,
        audienceRules: act.audienceRules,
        creatorId: act.createdBy
      }));

    const teamSessions = teamAttendanceSessions
      .filter(session => session.date === todayStr)
      .map(session => ({
        id: `team-${session.id}`,
        name: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        isTeamSession: true,
        zoomUrl: session.zoomUrl,
        youtubeUrl: session.youtubeUrl,
        status: 'scheduled' as const,
        audienceType: session.audienceType,
        participantIds: session.manualParticipantIds || [],
        audienceRules: session.audienceRules,
        creatorId: session.creatorId,
        attendanceMode: session.attendanceMode || 'self'
      }));

    const combined = [...regularActivities, ...teamSessions];
    return combined.filter(item => {
      if (item.creatorId === loggedInEmployee?.id) return true;
      if (!item.audienceType || item.audienceType === 'public') return true;
      if (item.audienceType === 'manual') return item.participantIds.includes(loggedInEmployee?.id || '');
      if (item.audienceType === 'rules') return doesEmployeeMatchRules(loggedInEmployee, item.audienceRules || {});
      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activities, teamAttendanceSessions, loggedInEmployee]);

  const prayersToDisplay = useMemo(() => {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentDay = jakartaTime.getDay();
    const isFriday = currentDay === 5;
    const isLakiLaki = loggedInEmployee?.gender === 'Laki-laki';

    const filtered = PRAYERS.filter(p => {
      if (isFriday) {
        if (isLakiLaki) return p.id !== 'dzuhur';
        return p.id !== 'jumat';
      }
      return p.id !== 'jumat';
    });

    if (!prayerTimes) return filtered;
    return filtered.map(p => {
      const time = prayerTimes[p.id as keyof typeof prayerTimes];
      return time ? { ...p, time, startTime: time } : p;
    });
  }, [prayerTimes, loggedInEmployee?.gender]);

  const prayerAttendance = useMemo(() => {
    const rawAtt = loggedInEmployee?.id ? (allUsersData[loggedInEmployee.id]?.attendance || {}) : {};
    const todayStr = getTodayLocalDateString();
    const converted: Record<string, any> = {};
    Object.entries(rawAtt).forEach(([key, record]: [string, any]) => {
      if (record && record.status) {
        const parts = key.split('-');
        const prayerId = parts[0];
        const dateInKey = parts.slice(1).join('-');
        if (dateInKey === todayStr || (!dateInKey && new Date(record.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) === todayStr)) {
          converted[prayerId] = {
            status: record.status,
            reason: record.reason || null,
            timestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
            submitted: true,
            isLateEntry: record.is_late_entry ?? record.isLateEntry ?? false
          };
        }
      }
    });
    return converted;
  }, [loggedInEmployee, allUsersData]);

  const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const { attendedCount, totalWajibCount } = useMemo(() => {
    const attended = Object.values(prayerAttendance).filter(a => a.status === 'hadir').length;
    return { attendedCount: attended, totalWajibCount: prayersToDisplay.length };
  }, [prayerAttendance, prayersToDisplay]);

  const handlePrayerSubmit = async (prayerId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null, isLate: boolean = false) => {
    if (!loggedInEmployee) return;
    try {
      showMessage(status === 'hadir' ? '⌛ Mencatat kehadiran...' : '⌛ Mencatat alasan...', 'info');
      const dateStr = getTodayLocalDateString();
      const entityId = `${prayerId}-${dateStr}`;

      // 1. Save to Database
      await submitAttendance(loggedInEmployee.id, entityId, status, reason, isLate);

      // 2. Prepare timestamp for frontend
      const nowTs = Date.now();

      // 3. Update Employee Store (Attendance List) - IMMUTABLE
      setAllUsersData((prev: any) => {
        if (!prev[loggedInEmployee.id]) return prev;
        const user = prev[loggedInEmployee.id];
        return {
          ...prev,
          [loggedInEmployee.id]: {
            ...user,
            attendance: {
              ...(user.attendance || {}),
              [entityId]: {
                status,
                reason,
                timestamp: nowTs,
                isLateEntry: isLate,
                submitted: true
              }
            }
          }
        };
      });

      // 4. Update Dashboard Checklist (Monthly Activities) if HADIR
      if (status === 'hadir') {
        const now = timeValidationService.getCorrectedTime();
        const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const dayKey = now.getDate().toString().padStart(2, '0');

        const syncUpdate = (prevEmp: Employee) => {
          const monthlyActivities = { ...(prevEmp.monthlyActivities || {}) };
          const monthProgress = { ...(monthlyActivities[monthKey] || {}) };
          const dayProgress = { ...(monthProgress[dayKey] || {}) };

          dayProgress['shalat_berjamaah'] = true;
          monthProgress[dayKey] = dayProgress;
          monthlyActivities[monthKey] = monthProgress;

          return {
            ...prevEmp,
            monthlyActivities
          };
        };

        // Update Auth Store (loggedInEmployee)
        const updatedEmployee = syncUpdate(loggedInEmployee);
        setLoggedInEmployee(updatedEmployee);

        // Update Employee Store (allUsersData entry)
        setAllUsersData((prev: any) => {
          if (!prev[updatedEmployee.id]) return prev;
          const user = prev[updatedEmployee.id];
          return {
            ...prev,
            [updatedEmployee.id]: {
              ...user,
              employee: syncUpdate(user.employee)
            }
          };
        });

        // 5. Save Monthly Progress to DB
        const { updateMonthlyProgress } = await import('@/services/monthlyActivityService');
        await updateMonthlyProgress(loggedInEmployee.id, monthKey, updatedEmployee.monthlyActivities[monthKey]);
      }

      showMessage(status === 'hadir' ? '✅ Presensi sholat berhasil!' : '✅ Alasan tidak hadir dicatat', 'success');
      refreshActivityStats();
    } catch (error: any) {
      showMessage(`❌ Gagal: ${error.message || 'Terjadi kesalahan'}`, 'error');
    }
  };

  const handleActivitySubmit = async (activityId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null) => {
    if (!loggedInEmployee) return;
    const isTeam = activityId.startsWith('team-');
    showMessage('⌛ Memproses presensi...', 'info');
    try {
      if (isTeam) {
        if (status === 'tidak-hadir') { showMessage('Hanya presensi HADIR yang dicatat untuk sesi tim.', 'error'); return; }
        const sessionId = activityId.replace('team-', '');
        const session = teamAttendanceSessions.find(s => s.id === sessionId);
        if (!session) throw new Error('Sesi tidak ditemukan');
        await createTeamAttendanceRecord({ sessionId: session.id, userId: loggedInEmployee.id, userName: loggedInEmployee.name, attendedAt: Date.now(), sessionType: session.type, sessionDate: session.date, sessionStartTime: session.startTime, sessionEndTime: session.endTime });
      } else {
        await submitScheduledAttendance(activityId, loggedInEmployee.id, status as any, reason || undefined);

        // 🔥 OPTIMISTIC: Mark in monthlyActivities if applicable
        if (status === 'hadir') {
          const session = todaySchedule.find(s => s.id === activityId);
          if (session) {
            const type = session.name.toUpperCase();
            let activityIdInMutabaah = '';
            if (type.includes('KAJIAN SELASA')) activityIdInMutabaah = 'kajian_selasa';
            else if (type.includes('PERSYARIKATAN')) activityIdInMutabaah = 'persyarikatan'; // 🔥 FIX ID
            else if (type.includes('KIE')) activityIdInMutabaah = 'tepat_waktu_kie';
            else if (type.includes('DOA BERSAMA')) activityIdInMutabaah = 'doa_bersama';

            if (activityIdInMutabaah) {
              const now = timeValidationService.getCorrectedTime();
              const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
              const dayKey = now.getDate().toString().padStart(2, '0');

              const syncUpdate = (prev: Employee) => {
                const monthlyActivities = { ...(prev.monthlyActivities || {}) };
                const monthData = { ...(monthlyActivities[monthKey] || {}) };
                const dayData = { ...(monthData[dayKey] || {}) };
                dayData[activityIdInMutabaah] = true;
                monthData[dayKey] = dayData;
                monthlyActivities[monthKey] = monthData;
                return { ...prev, monthlyActivities };
              };

              const updatedEmployee = syncUpdate(loggedInEmployee);
              setLoggedInEmployee(updatedEmployee);
              setAllUsersData((prev: any) => {
                if (!prev[updatedEmployee.id]) return prev;
                return {
                  ...prev,
                  [updatedEmployee.id]: {
                    ...prev[updatedEmployee.id],
                    employee: syncUpdate(prev[updatedEmployee.id].employee)
                  }
                };
              });
            }
          }
        }
      }
      setActivityAttendance(prev => ({ ...prev, [activityId]: { status: status as any, submitted: true, timestamp: Date.now() } }));
      showMessage('✅ Presensi berhasil dicatat!', 'success');
      refreshActivityStats();
    } catch (error: any) {
      showMessage(`❌ Gagal: ${error.message}`, 'error');
    }
  };

  const handleTadarusSubmit = async (date: string, category: TadarusRequest['category'], notes: string) => {
    if (!loggedInEmployee?.id) return;
    if (!loggedInEmployee.mentorId) {
      addToast('Gagal: Mentor Anda belum diatur di sistem.', 'error');
      throw new Error('No mentor');
    }

    try {
      const newRequest: TadarusRequest = {
        menteeId: loggedInEmployee.id,
        mentorId: loggedInEmployee.mentorId,
        date, category, notes,
        id: `${loggedInEmployee.id}-${date}-${category || 'tadarus'}-${Date.now().toString().slice(-4)}`,
        menteeName: loggedInEmployee.name,
        requestedAt: Date.now(), status: 'pending',
      };
      await addOrUpdateTadarusRequest(newRequest);

      try {
        await createNotification({
          userId: loggedInEmployee.mentorId,
          type: 'tadarus_request',
          title: `Persetujuan ${category || 'Sesi'}`,
          message: `${loggedInEmployee.name} mengajukan kehadiran untuk ${category || 'kegiatan'} tgl ${new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}.`,
          linkTo: '/aktifitas-saya?tab=panel-mentor&subview=persetujuan' as any,
          relatedEntityId: newRequest.id
        });
      } catch (noteErr) {
        console.error("Notification failed but request succeeded", noteErr);
      }

      addToast('Permintaan berhasil dikirim', 'success');
    } catch (error: any) {
      addToast(error.message || 'Gagal mengirim permintaan', 'error');
      throw error;
    }
  };

  const handleMissedPrayerSubmit = async (data: { date: string, prayerId: string, prayerName: string, reason: string }) => {
    if (!loggedInEmployee?.id) return;
    if (!loggedInEmployee.mentorId) {
      addToast('Gagal: Mentor Anda belum diatur di sistem.', 'error');
      throw new Error('No mentor');
    }

    try {
      const trimmedReason = data.reason.trim();
      if (!trimmedReason) {
        addToast('Alasan harus diisi.', 'error');
        return;
      }

      const newRequest: MissedPrayerRequest = {
        menteeId: loggedInEmployee.id, mentorId: loggedInEmployee.mentorId, ...data,
        reason: trimmedReason,
        id: `${loggedInEmployee.id}-${data.date}-${data.prayerId}`,
        menteeName: loggedInEmployee.name, requestedAt: Date.now(), status: 'pending',
      };
      await addOrUpdateMissedPrayerRequest(newRequest);

      try {
        await createNotification({
          userId: loggedInEmployee.mentorId,
          type: 'missed_prayer_request',
          title: 'Presensi Terlewat',
          message: `${loggedInEmployee.name} mengajukan persetujuan untuk sholat ${data.prayerName} tgl ${new Date(data.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}.`,
          linkTo: '/aktifitas-saya?tab=panel-mentor&subview=persetujuan' as any,
          relatedEntityId: newRequest.id
        });
      } catch (noteErr) {
        console.error("Notification failed but request succeeded", noteErr);
      }

      addToast('Permintaan presensi terlewat berhasil dikirim', 'success');
    } catch (error: any) {
      addToast(error.message || 'Gagal mengirim permintaan', 'error');
      throw error;
    }
  };

  const openModal = (id: string, name: string, type: 'prayer' | 'activity', isLate: boolean = false) => {
    setModalState({ isOpen: true, entityId: id, entityName: name, isLateEntry: isLate, type });
  };

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      const jakartaTime = timeValidationService.getCorrectedTime();
      let found: string | null = null;
      for (const p of prayersToDisplay) {
        const start = new Date(jakartaTime); const [sh, sm] = p.startTime.split(':').map(Number); start.setHours(sh, sm, 0, 0);
        const end = new Date(jakartaTime); const [eh, em] = p.endTime.split(':').map(Number); end.setHours(eh, em, 0, 0);
        if (jakartaTime >= start && jakartaTime <= end) { found = p.id; break; }
      }
      if (found !== activePrayerId) setActivePrayerId(found);
    }, 1000);
    return () => clearInterval(timer);
  }, [prayersToDisplay, activePrayerId]);

  if (!loggedInEmployee) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-40 animate-in fade-in duration-1000">
      {/* 1. SHOLAT WAJIB SECTION */}
      <section className="mb-14">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <LayoutGrid className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Sholat Wajib</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5 italic">Mandatory Prayers • {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</p>
            </div>
          </div>

          <button
            onClick={() => setIsManualRequestModalOpen(true)}
            className="group px-6 py-4 bg-white/5 hover:bg-white/10 text-indigo-400 border border-white/10 rounded-3xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <History className="w-5 h-5 group-hover:rotate-[-30deg] transition-transform" />
            <span className="font-black text-sm uppercase tracking-widest">Presensi Terlewat</span>
          </button>
        </header>

        {prayerTimesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <PrayerCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {prayersToDisplay.map(prayer => {
              const jakartaTime = timeValidationService.getCorrectedTime();
              const endTime = new Date(jakartaTime);
              const [eh, em] = prayer.endTime.split(':').map(Number);
              endTime.setHours(eh, em, 0, 0);

              const att = prayerAttendance[prayer.id];
              const isSubmitted = !!att?.submitted;
              return (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  attendanceStatus={att}
                  isActive={activePrayerId === prayer.id}
                  isTimePast={jakartaTime > endTime && !isSubmitted}
                  onHadir={() => handlePrayerSubmit(prayer.id, 'hadir')}
                  onTidakHadir={() => openModal(prayer.id, prayer.name, 'prayer')}
                  onUbah={() => { }}
                  isAdmin={false}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 2. KEGIATAN TERJADWAL SECTION */}
      <section>
        <header className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Users className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Agenda Terjadwal</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5 italic">Scheduled Events & Group Sessions</p>
          </div>
        </header>

        {isLoadingActivities ? (
          <div className="p-20 text-center bg-indigo-950/20 backdrop-blur-md rounded-[3rem] border border-white/10">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-6 shadow-[0_0_15px_rgba(99,102,241,0.3)]"></div>
            <p className="text-indigo-200 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Menyeimbangkan Data...</p>
          </div>
        ) : todaySchedule.length === 0 ? (
          <div className="bg-indigo-950/20 backdrop-blur-md rounded-4xl p-24 border border-white/10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px]" />
            <div className="w-24 h-24 bg-white/5 rounded-4xl flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-inner">
              <CalendarClock className="w-12 h-12 text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Cakram Agenda Kosong</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm font-bold leading-relaxed italic">Anda tidak memiliki jadwal kegiatan atau sesi mentor untuk hari ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {todaySchedule.map(item => {
              const att = activityAttendance[item.id];
              const isSubmitted = !!att?.submitted;
              const currentTime = getCurrentTime();
              const [ch, cm] = currentTime.split(':').map(Number);
              const cMin = ch * 60 + cm;
              const [sh, sm] = item.startTime.split(':').map(Number);
              const sMin = sh * 60 + sm;
              const [eh, em] = item.endTime.split(':').map(Number);
              const eMin = eh * 60 + em;
              const isOngoing = cMin >= sMin && cMin <= eMin;
              const isWaiting = cMin < sMin;
              const isPast = cMin > eMin;
              const isActionable = (isOngoing || (isPast && !isSubmitted)) && !isSubmitted;

              // 🔥 NEW: Link access logic (20 mins before start until end)
              const isLinkAccessible = cMin >= (sMin - 20) && cMin <= eMin;

              return (
                <div key={item.id} className={`group relative overflow-hidden rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${isSubmitted
                  ? 'bg-white/5 backdrop-blur-sm border-green-400/30 shadow-lg shadow-green-500/10'
                  : isOngoing
                    ? 'bg-white/5 backdrop-blur-sm border-teal-300/40 shadow-xl shadow-teal-400/20'
                    : 'bg-white/5 backdrop-blur-sm border-white/10 shadow-md'
                  }`}>
                  {isOngoing && <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-teal-400 to-blue-400 animate-pulse" />}

                  <div className="flex justify-between items-start mb-8">
                    <div className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${isSubmitted
                      ? 'bg-green-500/20 text-green-300 border-green-400/30'
                      : isOngoing
                        ? 'bg-teal-500/20 text-teal-300 border-teal-400/40 animate-pulse'
                        : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                      {isSubmitted ? '✓ COMPLETE' : isOngoing ? '● LIVE NOW' : isWaiting ? '○ UPCOMING' : '✕ EXPIRED'}
                    </div>

                    <div className="flex gap-2">
                      {isLinkAccessible && item.zoomUrl && (
                        <a href={item.zoomUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-blue-500/10 text-blue-300 rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-400/20" title="Klik untuk masuk ke sesi Zoom">
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                      {isLinkAccessible && item.youtubeUrl && (
                        <a href={item.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-red-500/10 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-400/20" title="Klik untuk menonton di Youtube">
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${isSubmitted
                        ? 'bg-green-500/10 border-green-400/30 text-green-300'
                        : isOngoing
                          ? 'bg-teal-500/10 border-teal-400/30 text-teal-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                        }`}>
                        {item.isTeamSession ? <Users className="w-6 h-6" /> : <CalendarClock className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-black tracking-tight leading-tight ${isSubmitted
                          ? 'text-green-200'
                          : isOngoing
                            ? 'text-teal-200'
                            : 'text-white'
                          }`}>{item.name}</h3>
                        <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${isSubmitted
                          ? 'text-green-400/60'
                          : isOngoing
                            ? 'text-teal-400/70'
                            : 'text-slate-500'
                          }`}>{item.isTeamSession ? '★ Exclusive Session' : '◆ Regular Session'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 text-[10px] font-bold tracking-wide text-slate-400">
                      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"><Clock className="w-3.5 h-3.5" /> {item.startTime} - {item.endTime}</span>
                      <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"><TrendingUp className="w-3.5 h-3.5" /> Intensive</span>
                    </div>
                  </div>

                  {isActionable ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleActivitySubmit(item.id, 'hadir')} className="py-3.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                        ✓ HADIR
                      </button>
                      <button onClick={() => openModal(item.id, item.name, 'activity')} className="py-3.5 bg-white/5 border-2 border-white/10 text-slate-300 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all">
                        ✕ TIDAK
                      </button>
                    </div>
                  ) : (
                    <div className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border-2 ${isSubmitted
                      ? 'bg-green-500/10 text-green-300 border-green-400/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                      {isSubmitted ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      {isSubmitted ? 'CONFIRMED' : isWaiting ? 'LOCKED' : 'EXPIRED'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unified Modal */}
      {
        modalState.isOpen && (
          <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-indigo-950/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl max-w-md w-full p-12 border border-white/10 animate-in zoom-in-95 duration-500 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500" />
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-inner">
                <Info className={`w-10 h-10 ${modalState.isLateEntry ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">{modalState.isLateEntry ? `Keterlambatan` : `Alasan`} <span className="text-red-400">*</span></h3>
              <p className="text-slate-500 text-sm font-bold mb-10 italic">{modalState.entityName}</p>
              <textarea
                autoFocus
                className="w-full bg-white/5 text-white border border-white/10 rounded-2xl p-5 focus:border-indigo-500/50 focus:outline-none resize-none font-bold text-sm"
                rows={4}
                placeholder={modalState.isLateEntry ? "Berikan keterangan mengapa terlambat..." : "Berikan alasan yang jelas mengapa tidak hadir..."}
                id="global-reason-input"
              />
              <div className="flex gap-4 mt-10">
                <button onClick={closeModal} className="flex-1 py-4 bg-white/5 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl">BATAL</button>
                <button
                  onClick={() => {
                    const val = (document.getElementById('global-reason-input') as HTMLTextAreaElement)?.value.trim();
                    if (!val) {
                      addToast("Keterangan/alasan wajib diisi.", 'error');
                      return;
                    }
                    if (modalState.type === 'prayer') handlePrayerSubmit(modalState.entityId, modalState.isLateEntry ? 'hadir' : 'tidak-hadir', val, modalState.isLateEntry);
                    else handleActivitySubmit(modalState.entityId, 'tidak-hadir', val);
                    closeModal();
                  }}
                  className={`flex-1 py-4 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 ${modalState.isLateEntry ? 'bg-indigo-500 text-white' : 'bg-red-500 text-white'}`}
                >
                  KIRIM
                </button>
              </div>
            </div>
          </div>
        )
      }

      <UnifiedManualRequestModal isOpen={isManualRequestModalOpen} onClose={() => setIsManualRequestModalOpen(false)} onTadarusSubmit={handleTadarusSubmit} onMissedPrayerSubmit={handleMissedPrayerSubmit} />
    </div >
  );
};

export default PresensiComponent;
