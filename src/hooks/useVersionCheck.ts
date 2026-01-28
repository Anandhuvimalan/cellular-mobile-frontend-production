'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildId: string;
}

export function useVersionCheck(checkIntervalMs: number = 60000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Fetch initial version
    const fetchVersion = async () => {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const versionData: VersionInfo = await response.json();

        // Get stored version from localStorage
        const storedVersion = localStorage.getItem('app-version');

        if (!storedVersion) {
          // First time - store current version
          localStorage.setItem('app-version', versionData.buildId);
          setCurrentVersion(versionData);
        } else if (storedVersion !== versionData.buildId) {
          // Version changed - update available
          setUpdateAvailable(true);
          setCurrentVersion(versionData);
        } else {
          setCurrentVersion(versionData);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    fetchVersion();

    // Check periodically for updates
    const interval = setInterval(fetchVersion, checkIntervalMs);

    return () => clearInterval(interval);
  }, [checkIntervalMs]);

  const reloadApp = () => {
    if (currentVersion) {
      localStorage.setItem('app-version', currentVersion.buildId);
    }
    window.location.reload();
  };

  return { updateAvailable, currentVersion, reloadApp };
}
