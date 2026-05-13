// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdRequestOptions, RewardedAdReward } from 'react-native-google-mobile-ads';

import { buildRequestOptions, getAdUnitId } from './admob';

interface UseRewardedAdOptions {
  adUnitId?: string;
  requestOptions?: AdRequestOptions;
  isTestMode?: boolean;
}

export const useRewardedAd = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
}: UseRewardedAdOptions = {}) => {
  const resolvedAdUnitId = useMemo(
    () => adUnitId ?? getAdUnitId('rewarded', isTestMode),
    [adUnitId, isTestMode],
  );
  const [adModule, setAdModule] = useState<any | null>(null);
  const [ad, setAd] = useState<any | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reward, setReward] = useState<RewardedAdReward | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('react-native-google-mobile-ads')
      .then((module) => {
        if (isMounted) {
          setAdModule(module);
          setIsAvailable(true);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('Rewarded ads unavailable', error);
        }
        if (isMounted) {
          setAdModule(null);
          setIsAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!adModule || !resolvedAdUnitId) return;
    if (!adModule.RewardedAd?.createForAdRequest) {
      setIsAvailable(false);
      setAd(null);
      return;
    }

    let createdAd: any;
    try {
      createdAd = adModule.RewardedAd.createForAdRequest(
        resolvedAdUnitId,
        buildRequestOptions(requestOptions),
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to create rewarded ad', error);
      }
      setIsAvailable(false);
      setAd(null);
      return;
    }

    setAd(createdAd);
    return () => {
      createdAd?.destroy?.();
    };
  }, [adModule, requestOptions, resolvedAdUnitId]);

  useEffect(() => {
    if (!ad || !adModule) return;

    if (typeof ad.addAdEventListener !== 'function') {
      if (__DEV__) console.warn('RewardedAd.addAdEventListener is not available');
      setIsAvailable(false);
      setIsLoaded(false);
      setIsLoading(false);
      return;
    }

    const LOADED_EVT = adModule.RewardedAdEventType?.LOADED ?? adModule.AdEventType?.LOADED;

    const loadedUnsub = ad.addAdEventListener?.(LOADED_EVT, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });

    const CLOSED_EVT = adModule.AdEventType?.CLOSED;
    const ERROR_EVT = adModule.AdEventType?.ERROR;

    const closedUnsub =
      CLOSED_EVT ? ad.addAdEventListener?.(CLOSED_EVT, () => {
        setIsLoaded(false);
      }) : undefined;

    const errorUnsub =
      ERROR_EVT ? ad.addAdEventListener?.(ERROR_EVT, () => {
        setIsLoading(false);
        setIsLoaded(false);
      }) : undefined;

    const rewardUnsub = ad.addAdEventListener?.(
      adModule.RewardedAdEventType.EARNED_REWARD,
      (r: RewardedAdReward) => setReward(r),
    );

    return () => {
      if (typeof loadedUnsub === 'function') loadedUnsub();
      if (typeof closedUnsub === 'function') closedUnsub();
      if (typeof errorUnsub === 'function') errorUnsub();
      if (typeof rewardUnsub === 'function') rewardUnsub();
    };
  }, [ad, adModule]);

  const load = useCallback(() => {
    if (!ad || typeof ad.load !== 'function') {
      if (__DEV__) console.warn('RewardedAd.load is not available (ad not ready)');
      setIsAvailable(false);
      setIsLoading(false);
      setIsLoaded(false);
      return;
    }
    setIsLoading(true);
    ad.load();
  }, [ad]);

  const show = useCallback(() => {
    if (!ad || typeof ad.show !== 'function') {
      if (__DEV__) console.warn('RewardedAd.show is not available (ad not ready)');
      setIsAvailable(false);
      return;
    }
    if (isLoaded) ad.show();
  }, [ad, isLoaded]);

  const resetReward = useCallback(() => {
    setReward(null);
  }, []);

  return {
    ad,
    adUnitId: resolvedAdUnitId,
    isLoaded,
    isLoading,
    isAvailable,
    load,
    show,
    reward,
    resetReward,
  };
};
