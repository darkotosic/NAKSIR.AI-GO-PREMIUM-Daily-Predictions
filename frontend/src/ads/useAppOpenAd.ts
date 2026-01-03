// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdEventType, AdRequestOptions, AppOpenAd } from 'react-native-google-mobile-ads';

import { buildRequestOptions, getAdUnitId } from './admob';

interface UseAppOpenAdOptions {
  adUnitId?: string;
  requestOptions?: AdRequestOptions;
  isTestMode?: boolean;
}

export const useAppOpenAd = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
}: UseAppOpenAdOptions = {}) => {
  const resolvedAdUnitId = adUnitId ?? getAdUnitId('appOpen', isTestMode);
  const ad = useMemo(
    () => AppOpenAd.createForAdRequest(resolvedAdUnitId, buildRequestOptions(requestOptions)),
    [resolvedAdUnitId, requestOptions],
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    const loadedListener = ad.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });
    const openedListener = ad.addAdEventListener(AdEventType.OPENED, () => {
      setIsShowing(true);
    });
    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      setIsShowing(false);
    });
    const errorListener = ad.addAdEventListener(AdEventType.ERROR, () => {
      setIsLoading(false);
      setIsLoaded(false);
      setIsShowing(false);
    });

    return () => {
      loadedListener();
      openedListener();
      closedListener();
      errorListener();
      ad.destroy();
    };
  }, [ad]);

  const load = useCallback(() => {
    setIsLoading(true);
    ad.load();
  }, [ad]);

  const show = useCallback(() => {
    if (isLoaded) {
      ad.show();
    }
  }, [ad, isLoaded]);

  return {
    ad,
    isLoaded,
    isLoading,
    isShowing,
    load,
    show,
    adUnitId: resolvedAdUnitId,
  };
};
