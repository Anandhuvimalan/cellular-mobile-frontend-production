'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import UpdateNotification from '@/components/UpdateNotification';
import { ThemeProvider } from './ThemeRipple';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            className: '',
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
          }}
        />
        <UpdateNotification />
      </AuthProvider>
    </ThemeProvider>
  );
}
