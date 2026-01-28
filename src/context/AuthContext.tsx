'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { authAPI, warmDashboardLists } from '@/lib/api';
import { useDataStore } from '@/stores/dataStore';
import type { User, LoginRequest } from '@/types';


const MIN_AUTH_INTERVAL_MS = 60_000;

const dashboardRoutes = [
  { href: '/dashboard', roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/products', roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/categories', roles: ['super_admin', 'admin', 'main_inventory_manager'] },
  { href: '/dashboard/brands', roles: ['super_admin', 'admin', 'main_inventory_manager'] },
  { href: '/dashboard/variants', roles: ['super_admin', 'admin', 'main_inventory_manager'] },
  { href: '/dashboard/colors', roles: ['super_admin', 'admin', 'main_inventory_manager'] },
  { href: '/dashboard/gst-slabs', roles: ['super_admin'] },
  { href: '/dashboard/stock-batches', roles: ['super_admin', 'main_inventory_manager'] },
  { href: '/dashboard/shops', roles: ['super_admin'] },
  { href: '/dashboard/sub-stocks', roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/stock-requests', roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/pos', roles: ['super_admin', 'main_inventory_manager', 'sub_stock_manager'], requiresShop: true },
  { href: '/dashboard/sales', roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/customers', roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/notifications', roles: ['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'] },
  { href: '/dashboard/users', roles: ['super_admin', 'admin'] },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithoutNavigate: (credentials: LoginRequest) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastAuthCheckRef = useRef(0);
  const isCheckingRef = useRef(false);
  const throttleRef = useRef(0);
  const warmedRef = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    warmedRef.current = false;
    router.push('/login');
  }, [router]);

  const checkAuth = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastAuthCheckRef.current < MIN_AUTH_INTERVAL_MS) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    if (Date.now() < throttleRef.current) {
      setLoading(false);
      return;
    }

    lastAuthCheckRef.current = now;
    isCheckingRef.current = true;

    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp > currentTime) {
        const response = await authAPI.me();
        setUser(response.data);
      } else {
        logout();
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
      if (error.response?.status === 429) {
        throttleRef.current = Date.now() + MIN_AUTH_INTERVAL_MS;
      }
      logout();
    } finally {
      isCheckingRef.current = false;
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;

    const allowedRoutes = dashboardRoutes
      .filter((route) => {
        if (!route.roles.includes(user.role)) return false;
        if (route.requiresShop && !user.shop) return false;
        return true;
      })
      .map((route) => route.href);

    if (!allowedRoutes.length) return;

    let cancelled = false;

    const schedulePrefetch = () => {
      allowedRoutes.forEach((href, index) => {
        window.setTimeout(() => {
          if (cancelled) return;
          router.prefetch(href);
        }, index * 150);
      });
    };

    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (idle) {
      const idleId = idle(schedulePrefetch, { timeout: 2000 });
      return () => {
        cancelled = true;
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(schedulePrefetch, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [router, user]);

  useEffect(() => {
    if (!user || warmedRef.current) return;
    warmedRef.current = true;

    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      void warmDashboardLists({ role: user.role, hasShop: !!user.shop });
    };

    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (idle) {
      const idleId = idle(warm, { timeout: 1500 });
      return () => {
        cancelled = true;
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(warm, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [user]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(user);

      // Trigger preload for this user immediately
      // The dashboard layout will show the progress UI
      useDataStore.getState().preloadAll(user);

      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  // Login without navigating - returns user for caller to handle preload and navigation
  const loginWithoutNavigate = async (credentials: LoginRequest): Promise<User> => {
    try {
      const response = await authAPI.login(credentials);
      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(user);

      return user;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithoutNavigate,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
