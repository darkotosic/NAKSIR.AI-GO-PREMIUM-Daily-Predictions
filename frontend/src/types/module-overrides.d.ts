// Custom module augmentations to align with the installed native modules
// without loosening the global compiler settings.

declare module 'react-native-google-mobile-ads/native-ads' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export const NativeAdsManager: any;
  export const AdMediaView: ComponentType<ViewProps>;
  export const AdIconView: ComponentType<ViewProps>;
  export const TriggerableView: ComponentType<ViewProps & { onTrigger?: () => void }>;
  export const NativeAdView: ComponentType<
    ViewProps & {
      adUnitId: string;
      onAdLoaded?: (event: any) => void;
      onAdFailedToLoad?: (error: any) => void;
    }
  >;
}

declare module 'react-native-google-mobile-ads' {
  import type { ComponentType } from 'react';
  import type { ViewProps } from 'react-native';

  export type AdRequestOptions = RequestOptions;

  export interface AppOpenAd {
    destroy?: () => void;
  }

  export interface RewardedAd {
    destroy?: () => void;
  }

  export interface RewardedInterstitialAd {
    destroy?: () => void;
  }

  export interface TestIdsType {
    NATIVE_ADVANCED?: string;
    [key: string]: string | undefined;
  }

  export const TestIds: TestIdsType;
  export const BannerAd: ComponentType<
    ViewProps & {
      unitId: string;
      size: string;
      requestOptions?: AdRequestOptions;
      onAdLoaded?: () => void;
      onAdFailedToLoad?: (error: any) => void;
    }
  >;
  export const BannerAdSize: Record<string, string>;
}

declare module 'react-native-iap' {
  export function flushFailedPurchasesCachedAsPendingAndroid(): Promise<void>;
  export function getSubscriptions(skus: { skus: string[] } | string[]): Promise<any>;
  export function requestSubscription(sku: string | { sku: string }): Promise<any>;
}
