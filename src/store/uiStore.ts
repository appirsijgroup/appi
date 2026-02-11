
import { create } from 'zustand';
import React from 'react';
import { type View, type Toast, type Notification, Ayah, SurahDetail, DailyPrayer, PrayerGuide } from '@/types';
import { CheckIcon, XIcon } from '@/components/ui/Icons';
import { type PrayerTimesData } from '@/services/prayerTimeService';
import { timeValidationService } from '@/services/timeValidationService';

export interface ShareModalState {
    isOpen: boolean;
    type: 'quran' | 'doa' | null;
    content: { ayah: Ayah; surah: SurahDetail } | DailyPrayer | PrayerGuide | null;
}

interface UIState {
    activeView: View;
    setActiveView: (view: View) => void;
    isMenuOpen: boolean;
    setIsMenuOpen: (isOpen: boolean) => void;
    toggleMenu: () => void;
    modalState: { isOpen: boolean; entityId: string | null; entityName: string | null; };
    openModal: (entityId: string, entityName: string) => void;
    closeModal: () => void;
    toasts: Toast[];
    addToast: (message: string, type: 'success' | 'error') => void;
    removeToast: (id: number) => void;
    isMentorOpen: boolean;
    setIsMentorOpen: (isOpen: boolean) => void;
    isNotificationPanelOpen: boolean;
    setIsNotificationPanelOpen: (isOpen: boolean) => void;
    showActivationModal: boolean;
    setShowActivationModal: (show: boolean) => void;
    lateEntryPrayerId: string | null;
    setLateEntryPrayerId: (id: string | null) => void;
    shareModalState: ShareModalState;
    openShareModal: (type: 'quran' | 'doa', content: ShareModalState['content']) => void;
    closeShareModal: () => void;
    goToAyah: { surah: number; ayah: number } | null;
    setGoToAyah: (target: { surah: number; ayah: number } | null) => void;
    clearGoToAyah: () => void;
    guideSearchQuery: string;
    guideInitialTab: 'panduan' | 'doa';
    setGuideSearch: (query: string, tab: 'panduan' | 'doa') => void;
    clearSearchQuery: () => void;
    deepLink: Notification['linkTo'] | null;
    setDeepLink: (link: Notification['linkTo'] | null) => void;
    initialTab?: string;
    onClearDeepLink: () => void;
    prayerTimes: PrayerTimesData | null;
    prayerTimesLoading: boolean;
    locationStatus: string | null;
    activePrayerId: string | null;
    currentTime: Date;
    userLocation: { latitude: number; longitude: number } | null;
    setPrayerTimes: (times: PrayerTimesData | null) => void;
    setPrayerTimesLoading: (loading: boolean) => void;
    setLocationStatus: (status: string | null) => void;
    setActivePrayerId: (id: string | null) => void;
    setCurrentTime: (time: Date) => void;
    setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
    globalLoading: { show: boolean; message: string };
    setGlobalLoading: (show: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    activeView: 'dashboard-saya',
    setActiveView: (view) => set({ activeView: view }),
    isMenuOpen: false,
    setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),
    toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),
    modalState: { isOpen: false, entityId: null, entityName: null },
    openModal: (entityId, entityName) => set({ modalState: { isOpen: true, entityId, entityName } }),
    closeModal: () => set({ modalState: { isOpen: false, entityId: null, entityName: null } }),
    toasts: [],
    addToast: (message, type) => {
        const id = Date.now();
        const title = type === 'success' ? 'Berhasil' : 'Gagal';
        const icon = type === 'success'
            ? React.createElement(CheckIcon, { className: "h-5 w-5 text-teal-300" })
            : React.createElement(XIcon, { className: "h-5 w-5 text-red-400" });
        set(state => ({ toasts: [...state.toasts, { id, title, message, type, icon }] }));
        setTimeout(() => get().removeToast(id), 5000);
    },
    removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
    isMentorOpen: false,
    setIsMentorOpen: (isOpen) => set({ isMentorOpen: isOpen }),
    isNotificationPanelOpen: false,
    setIsNotificationPanelOpen: (isOpen) => set({ isNotificationPanelOpen: isOpen }),
    showActivationModal: false,
    setShowActivationModal: (show) => set({ showActivationModal: show }),
    lateEntryPrayerId: null,
    setLateEntryPrayerId: (id) => set({ lateEntryPrayerId: id }),
    shareModalState: { isOpen: false, type: null, content: null, },
    openShareModal: (type, content) => set({ shareModalState: { isOpen: true, type, content } }),
    closeShareModal: () => set({ shareModalState: { isOpen: false, type: null, content: null } }),
    goToAyah: null,
    setGoToAyah: (target) => set({ goToAyah: target }),
    clearGoToAyah: () => set({ goToAyah: null }),
    guideSearchQuery: '',
    guideInitialTab: 'panduan',
    setGuideSearch: (query, tab) => set({ activeView: 'panduan-doa', guideSearchQuery: query, guideInitialTab: tab }),
    clearSearchQuery: () => set({ guideSearchQuery: '' }),
    deepLink: null,
    setDeepLink: (link) => {
        if (link && typeof link === 'object' && 'tab' in link && link.tab) {
            set({ deepLink: link, initialTab: link.tab as string });
        } else {
            set({ deepLink: link, initialTab: undefined });
        }
    },
    initialTab: undefined,
    onClearDeepLink: () => set({ deepLink: null, initialTab: undefined }),
    prayerTimes: null,
    prayerTimesLoading: true,
    locationStatus: null,
    activePrayerId: null,
    currentTime: timeValidationService.getCorrectedTime(),
    userLocation: null,
    setPrayerTimes: (times) => set({ prayerTimes: times }),
    setPrayerTimesLoading: (loading) => set({ prayerTimesLoading: loading }),
    setLocationStatus: (status) => set({ locationStatus: status }),
    setActivePrayerId: (id) => set({ activePrayerId: id }),
    setCurrentTime: (time) => {
        const timeValidation = timeValidationService.validateTime();
        if (!timeValidation.isValid) {
            set({ currentTime: timeValidation.correctedTime });
        } else {
            set({ currentTime: time });
        }
    },
    setUserLocation: (location) => set({ userLocation: location }),
    globalLoading: { show: false, message: 'Memuat...' },
    setGlobalLoading: (show, message = 'Memuat...') => set({ globalLoading: { show, message } }),
}));
