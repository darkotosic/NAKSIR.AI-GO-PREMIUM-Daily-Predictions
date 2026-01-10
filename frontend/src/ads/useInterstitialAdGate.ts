// @ts-nocheck
import { useCallback, useEffect, useRef } from 'react';
import type { AdRequestOptions } from 'react-native-google-mobile-ads';

import { useInterstitialAd } from './useInterstitialAd';

interface UseInterstitialAdGateOptions {
  adUnitId?: string;
  requestOptions?: AdRequestOptions;
  isTestMode?: boolean;
  timeoutMs?: number;
}

export const useInterstitialAdGate = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
  timeoutMs = 4000,
}: UseInterstitialAdGateOptions = {}) => {
  const resolveRef = useRef<(() => void) | null>(null);
  const showRequestedRef = useRef(false);

  const { isLoaded, isLoading, isSupported, load, show } = useInterstitialAd({
    adUnitId,
    requestOptions,
    isTestMode,
    onClosed: () => {
      resolveRef.current?.();
      resolveRef.current = null;
    },
    onError: () => {
      resolveRef.current?.();
      resolveRef.current = null;
    },
  });

  useEffect(() => {
    if (isSupported) {
      load();
    }
  }, [isSupported, load]);

  useEffect(() => {
    if (showRequestedRef.current && isLoaded) {
      showRequestedRef.current = false;
      show();
    }
  }, [isLoaded, show]);

  const showAd = useCallback(() => {
    if (!isSupported) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (!resolveRef.current) return;
        resolveRef.current = null;
        resolve();
      }, timeoutMs);

      resolveRef.current = () => {
        clearTimeout(timeoutId);
        resolveRef.current = null;
        resolve();
      };

      if (isLoaded) {
        show();
      } else {
        showRequestedRef.current = true;
        load();
      }
    });
  }, [isLoaded, isSupported, load, show, timeoutMs]);

  return {
    showAd,
    isLoaded,
    isLoading,
    isSupported,
  };
};
