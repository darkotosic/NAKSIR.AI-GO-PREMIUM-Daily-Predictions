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
}

export const useInterstitialAd = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
  onClosed,
  onError,
  onOpened,
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
  }, [ad, onClosed, onError, onOpened]);

  const load = useCallback(() => {
    if (!ad?.load) return;
    setIsLoading(true);
    ad.load();
  }, [ad]);

  const show = useCallback(() => {
    if (isLoaded && ad?.show) {
      ad.show();
    }
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
