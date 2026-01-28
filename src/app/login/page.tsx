'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { motion } from 'motion/react';
import FullScreenLoader from '@/components/FullScreenLoader';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loginWithoutNavigate } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Preload state
  const [showPreloader, setShowPreloader] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const {
    preloadProgress,
    preloadSteps,
    isPreloaded,
    preloadAll
  } = useDataStore();

  // If already authenticated and preloaded, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && isPreloaded) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isPreloaded, router]);

  // Navigate to dashboard when preload completes
  useEffect(() => {
    if (showPreloader && isPreloaded) {
      console.log('[Login] Preload complete, navigating to dashboard');
      router.push('/dashboard');
    }
  }, [showPreloader, isPreloaded, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Login using AuthContext (sets user state properly)
      console.log('[Login] Authenticating...');
      const user = await loginWithoutNavigate({ username, password });

      // Step 2: Show preloader and start preloading
      console.log('[Login] Login successful, starting preload for:', user.username);
      setLoggedInUser(user);
      setShowPreloader(true);
      setLoading(false);

      // Step 3: Start preload
      preloadAll(user);

    } catch (err: any) {
      console.error('[Login] Login failed:', err);
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  // Show preloader after successful login
  if (showPreloader) {
    return (
      <FullScreenLoader
        label={`Welcome, ${loggedInUser?.username || 'User'}! Preparing your workspace...`}
        progress={preloadProgress}
        steps={preloadSteps}
        showProgress={true}
      />
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 50,
        damping: 20,
      },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white selection:bg-sky-500/30">

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        {/* Deep Grain Overlay */}
        <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

        {/* Floating Orbs */}
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-sky-500/20 blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{
            x: [0, -70, 30, 0],
            y: [0, 60, -40, 0],
            scale: [1, 1.1, 0.8, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 2 }}
          className="absolute top-[20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-[100px] mix-blend-screen"
        />
        <motion.div
          animate={{
            x: [0, 40, -40, 0],
            y: [0, -30, 60, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 5 }}
          className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-violet-600/15 blur-[130px] mix-blend-screen"
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-12 md:gap-20"
        >

          {/* Left Side: Brand content */}
          <motion.div variants={itemVariants} className="w-full md:w-1/2 text-center md:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              System Operational
            </div>

            <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              <span className="block text-slate-100">Cellular</span>
              <span className="block mt-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md mx-auto md:mx-0 leading-relaxed">
              Advanced inventory management and point-of-sale telemetry.
              Control every pixel of your business operations.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
              {[
                { label: 'Real-time', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                { label: 'Secure', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { label: 'Cloud Native', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
              ].map((tag, i) => (
                <div key={i} className={`px-4 py-2 rounded-xl border ${tag.color} text-xs font-semibold backdrop-blur-md`}>
                  {tag.label}
                </div>
              ))}
            </div>
          </motion.div>


          {/* Right Side: Login Form */}
          <motion.div variants={itemVariants} className="w-full md:w-1/2 max-w-md">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-sky-600 to-violet-600 opacity-30 blur-xl transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />

              <div className="relative rounded-[1.75rem] border border-slate-800/60 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-slate-100">Welcome Back</h2>
                  <p className="text-slate-400 text-sm mt-2">Enter credentials to decouple</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 px-4 py-3 text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-sky-500/50 focus:bg-slate-950/80 focus:ring-4 focus:ring-sky-500/10"
                      placeholder="john.doe"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/50 px-4 py-3 text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-sky-500/50 focus:bg-slate-950/80 focus:ring-4 focus:ring-sky-500/10"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="pt-4">
                    <HoverBorderGradient
                      as="button"
                      type="submit"
                      containerClassName="w-full"
                      className="w-full justify-center bg-sky-600/10 text-sky-100 dark:bg-sky-600/10 dark:text-sky-100 font-semibold tracking-wide"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Authenticating...
                        </span>
                      ) : 'Sign In'}
                    </HoverBorderGradient>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
