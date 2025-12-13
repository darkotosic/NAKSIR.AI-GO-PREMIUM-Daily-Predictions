import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdEventType,
  AdRequestOptions,
  RewardedAd,
  RewardedAdEventType,
  RewardedAdReward,
} from 'react-native-google-mobile-ads';

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
  const resolvedAdUnitId = adUnitId ?? getAdUnitId('rewarded', isTestMode);
  const ad = useMemo(
    () => RewardedAd.createForAdRequest(resolvedAdUnitId, buildRequestOptions(requestOptions)),
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
