'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `tick` every `intervalMs` while the browser tab is visible, and once
 * more as soon as the tab becomes visible again. Pass `enabled = false` to stop.
 */
export function usePolling(tick: () => void, intervalMs: number, enabled = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });

  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (document.visibilityState === 'visible') latest.current();
    };
    const id = window.setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', run);
    };
  }, [intervalMs, enabled]);
}

/**
 * Runs `refresh` whenever `version` changes after the component mounted.
 * The initial load stays with the component's own effect, so a section opened
 * after some updates doesn't fetch twice.
 */
export function useRefreshOn(version: number, refresh: () => void) {
  const latest = useRef(refresh);
  const seen = useRef(version);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    if (version === seen.current) return;
    seen.current = version;
    latest.current();
  }, [version]);
}
