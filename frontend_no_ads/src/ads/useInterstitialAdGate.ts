// @ts-nocheck
import { useCallback, useEffect, useRef } from 'react';
import { useGlobalInterstitial } from './InterstitialProvider';

interface UseInterstitialAdGateOptions {
  timeoutMs?: number;
}

export const useInterstitialAdGate = ({ timeoutMs = 4000 }: UseInterstitialAdGateOptions = {}) => {
  const resolveRef = useRef<((shown: boolean) => void) | null>(null);
  const showRequestedRef = useRef(false);
  const didShowRef = useRef(false);

  const interstitial = useGlobalInterstitial();

  useEffect(() => {
    if (showRequestedRef.current && interstitial.isLoaded) {
      showRequestedRef.current = false;
      didShowRef.current = true;
      interstitial.show();
    }
  }, [interstitial.isLoaded, interstitial.show]);

  const showAd = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (!interstitial.isEnabled) {
        resolve(false);
        return;
      }

      didShowRef.current = false;

      const timeoutId = setTimeout(() => {
        const r = resolveRef.current;
        if (!r) return;
        resolveRef.current = null;
        r(false);
      }, timeoutMs);

      const unsubscribe = interstitial.addClosedListener(() => {
        clearTimeout(timeoutId);
        unsubscribe();
        const r = resolveRef.current;
        resolveRef.current = null;
        r?.(didShowRef.current);
      });

      resolveRef.current = (shown: boolean) => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(shown);
      };

      if (interstitial.isLoaded) {
        didShowRef.current = true;
        interstitial.show();
      } else {
        showRequestedRef.current = true;
        interstitial.load();
      }
    });
  }, [interstitial.isEnabled, interstitial.addClosedListener, interstitial.isLoaded, interstitial.load, interstitial.show, timeoutMs]);

  return {
    showAd,
    isLoaded: interstitial.isLoaded,
    isLoading: interstitial.isLoading,
    isSupported: interstitial.isEnabled,
  };
};
