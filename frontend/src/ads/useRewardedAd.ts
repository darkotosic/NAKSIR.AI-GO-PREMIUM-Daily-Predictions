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
  const [isAvailable, setIsAvailable] = useState(true);

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
    const createdAd = adModule.RewardedAd.createForAdRequest(
      resolvedAdUnitId,
      buildRequestOptions(requestOptions),
    );
    setAd(createdAd);
    return () => {
      createdAd?.destroy?.();
    };
  }, [adModule, requestOptions, resolvedAdUnitId]);

  useEffect(() => {
    if (!ad || !adModule) return;
    const loadedListener = ad.addAdEventListener(adModule.AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });
    const closedListener = ad.addAdEventListener(adModule.AdEventType.CLOSED, () => {
      setIsLoaded(false);
    });
    const errorListener = ad.addAdEventListener(adModule.AdEventType.ERROR, () => {
      setIsLoading(false);
      setIsLoaded(false);
    });
    const rewardListener = ad.addAdEventListener(adModule.RewardedAdEventType.EARNED_REWARD, setReward);

    return () => {
      loadedListener();
      closedListener();
      errorListener();
      rewardListener();
    };
  }, [ad, adModule]);

  const load = useCallback(() => {
    if (!ad) {
      setIsLoading(false);
      return;
    }
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
    adUnitId: resolvedAdUnitId,
    isLoaded,
    isLoading,
    isAvailable,
    load,
    show,
    reward,
  };
};
