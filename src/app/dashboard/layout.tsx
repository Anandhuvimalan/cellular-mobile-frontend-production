'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FullScreenLoader from '@/components/FullScreenLoader';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const {
    preloadStatus,
    preloadProgress,
    preloadSteps,
    isPreloaded,
    preloadAll,
    resetPreload,
  } = useDataStore();

  // Start preload when user is authenticated and not yet preloaded
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isPreloaded && preloadStatus === 'idle') {
      console.log('[Preloader] Starting preload for user:', user.username, user.role);
      preloadAll(user);
    }
  }, [authLoading, isAuthenticated, user, isPreloaded, preloadStatus, preloadAll]);

  // Reset preload on logout
  useEffect(() => {
    if (!isAuthenticated && isPreloaded) {
      resetPreload();
    }
  }, [isAuthenticated, isPreloaded, resetPreload]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Show auth loading
  if (authLoading) {
    return <FullScreenLoader label="Authenticating session" />;
  }

  // Not authenticated - redirect will happen
  if (!isAuthenticated || !user) {
    return null;
  }

  // BLOCK until preload is complete - show progress bar
  if (!isPreloaded) {
    return (
      <FullScreenLoader
        label={preloadStatus === 'loading' ? 'Preparing your workspace' : 'Loading...'}
        progress={preloadProgress}
        steps={preloadSteps}
        showProgress={preloadStatus === 'loading'}
      />
    );
  }

  // Preload complete - show dashboard
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <div className="relative flex min-h-screen flex-1 flex-col overflow-x-hidden">
          <div className="print:hidden">
            <Header />
          </div>
          <main className="relative flex-1 overflow-y-auto scrollbar-hide bg-transparent px-3 pb-6 pt-4 text-slate-900 dark:text-slate-100 sm:px-6 sm:pb-10 sm:pt-8 lg:px-10 print:p-0 print:bg-white">
            {children}
          </main>
        </div>
      </div>

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>;
}
