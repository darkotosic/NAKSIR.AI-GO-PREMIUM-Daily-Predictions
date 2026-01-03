import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

import { useAppOpenAd } from './useAppOpenAd';

// Product-first defaults: minimal friction, minimal spam.
// - Show on cold start once
// - Show again only if user returns from background after meaningful time
const RESUME_MIN_BG_MS = 15 * 60 * 1000; // 15 min
const SHOW_COOLDOWN_MS = 3 * 60 * 1000; // 3 min safety (prevents rapid repeats)

const now = () => Date.now();

const AppOpenAdManager: React.FC = () => {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const firstForeground = useRef(true);
  const lastBackgroundAt = useRef<number | null>(null);
  const lastShownAt = useRef<number>(0);

  const { isLoaded, isLoading, isShowing, load, show } = useAppOpenAd({ isTestMode: __DEV__ });

  // Always keep an ad preloaded.
  useEffect(() => {
    if (!isLoaded && !isLoading) load();
  }, [isLoaded, isLoading, load]);

  // After closing, preload next one.
  useEffect(() => {
    if (!isShowing && !isLoaded && !isLoading) load();
  }, [isShowing, isLoaded, isLoading, load]);

  const maybeShow = () => {
    if (!isLoaded) return;
    if (isShowing) return;

    const t = now();

    // Cooldown: never spam
    if (t - lastShownAt.current < SHOW_COOLDOWN_MS) return;

    // Cold start: show once when app first becomes active
    if (firstForeground.current) {
      firstForeground.current = false;
      lastShownAt.current = t;
      show();
      return;
    }

    // Resume: show only if user was away long enough
    const bgAt = lastBackgroundAt.current;
    if (bgAt && t - bgAt >= RESUME_MIN_BG_MS) {
      lastShownAt.current = t;
      show();
    }
  };

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      // Track background timestamp
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackgroundAt.current = now();
        return;
      }

      // Foreground: attempt show (policy-compliant moment)
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        // Android tends to be more sensitive on timing; micro-delay helps stability
        const delay = Platform.OS === 'android' ? 250 : 0;
        setTimeout(maybeShow, delay);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isShowing, show]);

  return null; // no UI
};

export default AppOpenAdManager;
