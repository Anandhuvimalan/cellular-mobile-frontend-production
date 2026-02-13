'use client';

import { useAuth } from '@/context/AuthContext';
import { FiBell, FiChevronDown, FiLogOut, FiUser, FiSun, FiMoon, FiSettings } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { notificationsAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeRipple';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const normalizeRole = (role: unknown): string => {
    if (!role) return '';
    if (typeof role === 'string') {
      const normalized = role.trim().toLowerCase().replace(/[-\s]+/g, '_');
      return normalized === 'superadmin' ? 'super_admin' : normalized;
    }
    if (typeof role === 'object') {
      const roleObj = role as { name?: string; value?: string; slug?: string };
      return normalizeRole(roleObj.value ?? roleObj.slug ?? roleObj.name ?? '');
    }
    return '';
  };
  const userRole = normalizeRole(user?.role);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.unreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/40 bg-white/60 backdrop-blur-2xl transition-all duration-300 dark:border-white/5 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/70 dark:text-slate-400/70">
            System Control
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Welcome back,
            </h2>
            <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-lg font-bold text-transparent dark:from-sky-400 dark:via-blue-400 dark:to-cyan-400">
              {user?.first_name || user?.username}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Quick Actions / Status could go here */}

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="relative flex items-center gap-3 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 px-2 pl-2 pr-4 py-1.5 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 p-0.5 shadow-md">
                <div className="h-full w-full rounded-full bg-slate-950/20 backdrop-blur-sm flex items-center justify-center text-white">
                  <FiUser size={16} />
                </div>
              </div>

              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name || user?.username || 'User'}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>

              <FiChevronDown
                size={16}
                className={`ml-2 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
              />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  className="absolute right-0 mt-3 w-72 origin-top-right rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] backdrop-blur-2xl ring-1 ring-slate-950/5 dark:ring-white/5"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="px-5 py-4 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
                        <span className="text-lg font-bold">{user?.username?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {user?.first_name || user?.username || 'User'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user?.username}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        router.push('/dashboard/notifications');
                        setIsProfileOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${unreadCount > 0
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                    >
                      <FiBell size={18} />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          router.push('/dashboard/settings');
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <div className="p-1 rounded bg-slate-200/50 dark:bg-white/5">
                          <FiSettings size={14} />
                        </div>
                        <span>Settings</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        // Pass event to toggleTheme for ripple
                        toggleTheme(e);
                        setIsProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <div className={`p-1 rounded ${theme === 'dark' ? 'bg-amber-400/20 text-amber-400' : 'bg-slate-200/50 text-slate-600 dark:text-slate-300'}`}>
                        {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
                      </div>
                      <span className="flex-1 text-left">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                  </div>

                  <div className="p-2 border-t border-slate-200/60 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <FiLogOut size={18} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
