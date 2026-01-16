import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { getAdUnitId } from './admob';
import { useInterstitialAd } from './useInterstitialAd';

type InterstitialCtx = {
  isLoaded: boolean;
  isLoading: boolean;
  show: () => Promise<boolean>;
  load: () => void;
  addClosedListener: (listener: () => void) => () => void;
};

const Ctx = createContext<InterstitialCtx | null>(null);

export function InterstitialProvider({ children }: { children: React.ReactNode }) {
  const closedListenersRef = useRef(new Set<() => void>());

  const notifyClosed = useCallback(() => {
    closedListenersRef.current.forEach((listener) => listener());
  }, []);

  const addClosedListener = useCallback((listener: () => void) => {
    closedListenersRef.current.add(listener);
    return () => {
      closedListenersRef.current.delete(listener);
    };
  }, []);

  const ad = useInterstitialAd({
    adUnitId: getAdUnitId('interstitial', __DEV__),
    autoReload: true,
    onClosed: notifyClosed,
    onError: notifyClosed,
  });

  useEffect(() => {
    ad.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<InterstitialCtx>(() => {
    return {
      isLoaded: ad.isLoaded,
      isLoading: ad.isLoading,
      show: ad.show,
      load: ad.load,
      addClosedListener,
    };
  }, [ad.isLoaded, ad.isLoading, ad.show, ad.load, addClosedListener]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalInterstitial() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGlobalInterstitial must be used within InterstitialProvider');
  return v;
}
