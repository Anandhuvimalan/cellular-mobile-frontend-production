import { useEffect, useRef } from 'react';

type AutoRefreshOptions = {
  intervalMs?: number;
  enabled?: boolean;
  immediate?: boolean;
};

export function useAutoRefresh(callback: () => void, options: AutoRefreshOptions = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const { intervalMs = 15000, enabled = isProduction, immediate = false } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    if (immediate) {
      savedCallback.current();
    }

    const handleFocus = () => savedCallback.current();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        savedCallback.current();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, immediate, intervalMs]);
}
