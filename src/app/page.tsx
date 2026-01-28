'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function HomeContent() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card text-center animate-fade-up">
        <h1 className="text-3xl font-semibold mb-2">Cellular Stock Management</h1>
        <p className="text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
