'use client';

import { useVersionCheck } from '@/hooks/useVersionCheck';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import { useState } from 'react';

export default function UpdateNotification() {
  const { updateAvailable, reloadApp } = useVersionCheck(60000); // Check every minute
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.65)] backdrop-blur-sm max-w-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/15 p-2">
            <FiRefreshCw className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-100">
              Update Available
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              A new version of the app is available. Please reload to get the latest features and fixes.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={reloadApp}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
              >
                <FiRefreshCw className="h-3.5 w-3.5" />
                Reload Now
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
