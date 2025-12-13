import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdEventType,
  AdRequestOptions,
  RewardedAdEventType,
  RewardedAdReward,
  RewardedInterstitialAd,
} from 'react-native-google-mobile-ads';

import { buildRequestOptions, getAdUnitId } from './admob';

interface UseRewardedInterstitialAdOptions {
  adUnitId?: string;
  requestOptions?: AdRequestOptions;
  isTestMode?: boolean;
}

export const useRewardedInterstitialAd = ({
  adUnitId,
  requestOptions,
  isTestMode = __DEV__,
}: UseRewardedInterstitialAdOptions = {}) => {
  const resolvedAdUnitId = adUnitId ?? getAdUnitId('rewardedInterstitial', isTestMode);
  const ad = useMemo(
    () => RewardedInterstitialAd.createForAdRequest(resolvedAdUnitId, buildRequestOptions(requestOptions)),
    [resolvedAdUnitId, requestOptions],
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reward, setReward] = useState<RewardedAdReward | null>(null);

  useEffect(() => {
    const loadedListener = ad.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });
    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
    });
    const errorListener = ad.addAdEventListener(AdEventType.ERROR, () => {
      setIsLoading(false);
      setIsLoaded(false);
    });
    const rewardListener = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, setReward);

    return () => {
      loadedListener();
      closedListener();
      errorListener();
      rewardListener();
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
    adUnitId: resolvedAdUnitId,
    isLoaded,
    isLoading,
    load,
    show,
    reward,
  };
};
