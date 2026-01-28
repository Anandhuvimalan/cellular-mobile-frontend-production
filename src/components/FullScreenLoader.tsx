'use client';

import { motion } from 'motion/react';
import type { PreloadStep } from '@/stores/dataStore';

type FullScreenLoaderProps = {
  label?: string;
  progress?: number;
  steps?: PreloadStep[];
  showProgress?: boolean;
};

export default function FullScreenLoader({
  label = 'Initializing System',
  progress = 0,
  steps = [],
  showProgress = false,
}: FullScreenLoaderProps) {
  const currentStep = steps.find((s) => s.status === 'loading') || steps.find((s) => s.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background text-foreground transition-colors duration-500">
      {/* Background Grid - Animated */}
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-40">
        <div className="absolute inset-0 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Central Animation */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        <div className="relative h-32 w-32 flex items-center justify-center">
          {/* Outer Ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Middle Ring */}
          <motion.div
            className="absolute inset-2 rounded-full border border-primary/50"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Core - Cellular Concept */}
          <div className="relative grid grid-cols-2 gap-1 p-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-4 w-4 rounded-sm bg-primary"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.4,
                  repeat: Infinity,
                  repeatDelay: 2,
                  repeatType: "reverse"
                }}
              />
            ))}
          </div>

          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
        </div>

        {/* Text Animation */}
        <div className="text-center space-y-2">
          <motion.h2
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            MAZE CELLULAR
          </motion.h2>
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {currentStep?.label || label}
            </span>
            {!showProgress && (
              <motion.span
                className="flex gap-1"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                . . .
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <motion.div
            className="w-80 max-w-[90vw] space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {/* Progress Bar Container */}
            <div className="relative h-2 w-full rounded-full bg-muted/50 overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

              {/* Progress Fill */}
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />

              {/* Glow on progress edge */}
              <motion.div
                className="absolute top-0 h-full w-4 bg-white/50 blur-sm"
                initial={{ left: 0 }}
                animate={{ left: `calc(${progress}% - 8px)` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            {/* Progress Text */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {steps.filter((s) => s.status === 'complete').length} / {steps.length} steps
              </span>
              <motion.span
                key={progress}
                className="font-mono font-semibold text-primary"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {progress}%
              </motion.span>
            </div>

            {/* Step Status Indicators */}
            <div className="flex justify-center gap-1 mt-2">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${step.status === 'complete' ? 'bg-emerald-500' :
                      step.status === 'loading' ? 'bg-primary animate-pulse' :
                        step.status === 'error' ? 'bg-rose-500' :
                          'bg-muted-foreground/30'
                    }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  title={step.label}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Shimmer animation style */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
