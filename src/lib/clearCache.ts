/**
 * 🔧 Cache Clearing Utility
 *
 * Fungsi untuk membersihkan semua cache aplikasi (React Query, Service Worker, Browser)
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Clear React Query Cache
 * Membersihkan semua cache di TanStack Query
 */
export function clearReactQueryCache(queryClient: QueryClient): void {
  try {
    // Clear semua queries
    queryClient.clear();

    // Clear dan reset query client
    queryClient.resetQueries();

    // Log removed for production
  } catch (error) {
    console.error('❌ Gagal membersihkan React Query cache:', error);
    throw error;
  }
}

/**
 * Clear Service Worker Cache
 * Membersihkan semua cache yang disimpan oleh Service Worker
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    // Log removed for production
    return;
  }

  try {
    // Dapatkan semua cache registrations
    const cacheNames = await caches.keys();

    // Delete semua cache
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    // Log removed for production

    // Unregister service worker
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );

    // Log removed for production
  } catch (error) {
    console.error('❌ Gagal membersihkan Service Worker cache:', error);
    throw error;
  }
}

/**
 * Clear Browser Storage
 * Membersihkan localStorage dan sessionStorage
 */
export function clearBrowserStorage(): void {
  try {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Log removed for production
  } catch (error) {
    console.error('❌ Gagal membersihkan browser storage:', error);
    throw error;
  }
}

/**
 * Clear All Cache
 * Membersihkan SEMUA cache (React Query, Service Worker, Browser Storage)
 *
 * @param queryClient - React Query Client instance
 * @param hardReload - Set true untuk reload halaman setelah clear cache
 */
export async function clearAllCache(
  queryClient?: QueryClient,
  hardReload: boolean = true
): Promise<void> {
  // Starting cache cleanup...

  try {
    // 1. Clear React Query Cache (jika queryClient disediakan)
    if (queryClient) {
      clearReactQueryCache(queryClient);
    }

    // 2. Clear Service Worker Cache
    await clearServiceWorkerCache();

    // 3. Clear Browser Storage
    clearBrowserStorage();

    // Cleanup success log removed for production

    // 4. Hard reload untuk memastikan cache bersih
    if (hardReload && typeof window !== 'undefined') {
      // Reloading...

      // Tunggu sebentar sebelum reload
      setTimeout(() => {
        // Hard reload dengan bypass cache
        window.location.reload();
      }, 500);
    }
  } catch (error) {
    console.error('❌ Terjadi error saat membersihkan cache:', error);
    throw error;
  }
}

/**
 * Debug Cache Status
 * Menampilkan status cache untuk debugging
 */
export async function debugCacheStatus(queryClient?: QueryClient): Promise<void> {
  // Debug logs removed for production
}
