// @ts-nocheck
import { useCallback, useEffect, useRef } from 'react';

import { useGlobalInterstitial } from './InterstitialProvider';

interface UseInterstitialAdGateOptions {
  timeoutMs?: number;
}

export const useInterstitialAdGate = ({ timeoutMs = 4000 }: UseInterstitialAdGateOptions = {}) => {
  const resolveRef = useRef<(() => void) | null>(null);
  const showRequestedRef = useRef(false);

  const interstitial = useGlobalInterstitial();

  useEffect(() => {
    if (showRequestedRef.current && interstitial.isLoaded) {
      showRequestedRef.current = false;
      interstitial.show();
    }
  }, [interstitial.isLoaded, interstitial.show]);

  const showAd = useCallback(() => {
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (!resolveRef.current) return;
        resolveRef.current = null;
        resolve();
      }, timeoutMs);

      const unsubscribe = interstitial.addClosedListener(() => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolveRef.current = null;
        resolve();
      });

      resolveRef.current = () => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolveRef.current = null;
        resolve();
      };

      if (interstitial.isLoaded) {
        interstitial.show();
      } else {
        showRequestedRef.current = true;
        interstitial.load();
      }
    });
  }, [interstitial.addClosedListener, interstitial.isLoaded, interstitial.load, interstitial.show, timeoutMs]);

  return {
    showAd,
    isLoaded: interstitial.isLoaded,
    isLoading: interstitial.isLoading,
    isSupported: true,
  };
};
