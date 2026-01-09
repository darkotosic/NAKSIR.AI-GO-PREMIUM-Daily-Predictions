export type AdUnitKey =
  | 'banner'
  | 'rewarded'
  | 'rewardedInterstitial'
  | 'appOpen'
  | 'nativeAdvanced';

export const getAdUnitId = (_key: AdUnitKey, _isTestMode: boolean = __DEV__): string => '';

export const buildRequestOptions = <T extends Record<string, unknown>>(overrides?: T): T => ({
  ...(overrides ?? ({} as T)),
});

export const configureMobileAds = async (): Promise<void> => undefined;
