// @ts-nocheck
import type { AdRequestOptions, MaxAdContentRating, RequestConfiguration } from 'react-native-google-mobile-ads';

export type AdUnitKey =
  | 'rewarded'
  | 'rewardedInterstitial'
  | 'appOpen'
  | 'nativeAdvanced';

export const AD_UNIT_IDS: Record<AdUnitKey, string> = {
  rewarded: 'ca-app-pub-1726722567967096/4620291260',
  rewardedInterstitial: 'ca-app-pub-1726722567967096/7932850317',
  appOpen: 'ca-app-pub-1726722567967096/3711546035',
  nativeAdvanced: 'ca-app-pub-1726722567967096/2127001625',
};

const TEST_IDS: Record<AdUnitKey, string> = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
  appOpen: 'ca-app-pub-3940256099942544/3419835294',
  nativeAdvanced: 'ca-app-pub-3940256099942544/2247696110',
};

export const getAdUnitId = (key: AdUnitKey, isTestMode: boolean = __DEV__): string => {
  return isTestMode ? TEST_IDS[key] : AD_UNIT_IDS[key];
};

export const buildRequestOptions = (overrides?: AdRequestOptions): AdRequestOptions => ({
  requestNonPersonalizedAdsOnly: false,
  ...overrides,
});

export const configureMobileAds = async (
  { isTestMode = __DEV__, maxAdContentRating = 'T' as MaxAdContentRating }: { isTestMode?: boolean; maxAdContentRating?: MaxAdContentRating },
): Promise<void> => {
  const configuration: RequestConfiguration = {
    maxAdContentRating,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    testDeviceIdentifiers: isTestMode ? ['EMULATOR'] : undefined,
  };

  const mobileAdsModule = await import('react-native-google-mobile-ads').catch((error) => {
    if (__DEV__) {
      console.warn('Mobile ads module unavailable', error);
    }
    return null;
  });

  if (!mobileAdsModule?.default) return;

  await mobileAdsModule.default().setRequestConfiguration(configuration);
  await mobileAdsModule.default().initialize();
};
