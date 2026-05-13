// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdEventType, AdRequestOptions, InterstitialAd } from 'react-native-google-mobile-ads';

import { buildRequestOptions, getAdUnitId } from './admob';

interface UseInterstitialAdOptions {
  adUnitId?: string;
  requestOptions?: AdRequestOptions;
  isTestMode?: boolean;
  onClosed?: () => void;
  onError?: () => void;
  onOpened?: () => void;
  autoReload?: boolean;
}

export const useInterstitialAd = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
  onClosed,
  onError,
  onOpened,
  autoReload = true,
}: UseInterstitialAdOptions = {}) => {
  const isSupported = Boolean(
    InterstitialAd && typeof InterstitialAd.createForAdRequest === 'function' && AdEventType,
  );
  const resolvedAdUnitId = adUnitId ?? getAdUnitId('interstitial', isTestMode);
  const ad = useMemo(
    () =>
      isSupported
        ? InterstitialAd.createForAdRequest(
            resolvedAdUnitId,
            buildRequestOptions(requestOptions),
          )
        : null,
    [isSupported, resolvedAdUnitId, requestOptions],
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  const load = useCallback(() => {
    if (!ad?.load) return;
    setIsLoading(true);
    ad.load();
  }, [ad]);

  useEffect(() => {
    if (!ad || !AdEventType) return;
    const loadedListener = ad.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });
    const openedListener = ad.addAdEventListener(AdEventType.OPENED, () => {
      setIsShowing(true);
      onOpened?.();
    });
    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      setIsShowing(false);
      onClosed?.();
      if (autoReload) {
        load();
      }
    });
    const errorListener = ad.addAdEventListener(AdEventType.ERROR, () => {
      setIsLoading(false);
      setIsLoaded(false);
      setIsShowing(false);
      onError?.();
    });

    return () => {
      loadedListener();
      openedListener();
      closedListener();
      errorListener();
      ad.destroy();
    };
  }, [ad, autoReload, load, onClosed, onError, onOpened]);

  const show = useCallback(async () => {
    if (isLoaded && ad?.show) {
      ad.show();
      return true;
    }
    return false;
  }, [ad, isLoaded]);

  return {
    ad,
    adUnitId: resolvedAdUnitId,
    isLoaded,
    isLoading,
    isShowing,
    isSupported,
    load,
    show,
  };
};
