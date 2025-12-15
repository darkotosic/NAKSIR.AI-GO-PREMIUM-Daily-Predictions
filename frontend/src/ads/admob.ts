// @ts-nocheck
import mobileAds, {
  AdRequestOptions,
  MaxAdContentRating,
  RequestConfiguration,
  TestIds,
} from 'react-native-google-mobile-ads';

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
  rewarded: TestIds.REWARDED,
  rewardedInterstitial: TestIds.REWARDED_INTERSTITIAL,
  appOpen: TestIds.APP_OPEN,
  nativeAdvanced: TestIds.NATIVE_ADVANCED,
};

export const getAdUnitId = (key: AdUnitKey, isTestMode: boolean = __DEV__): string => {
  return isTestMode ? TEST_IDS[key] : AD_UNIT_IDS[key];
};

export const buildRequestOptions = (overrides?: AdRequestOptions): AdRequestOptions => ({
  requestNonPersonalizedAdsOnly: false,
  ...overrides,
});

export const configureMobileAds = async (
  { isTestMode = __DEV__, maxAdContentRating = MaxAdContentRating.T }: { isTestMode?: boolean; maxAdContentRating?: MaxAdContentRating },
): Promise<void> => {
  const configuration: RequestConfiguration = {
    maxAdContentRating,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    testDeviceIdentifiers: isTestMode ? ['EMULATOR'] : undefined,
  };

  await mobileAds().setRequestConfiguration(configuration);
  await mobileAds().initialize();
};
