// Custom module augmentations to align with the installed native modules
// without loosening the global compiler settings.



declare module 'react-native-iap' {
  export function flushFailedPurchasesCachedAsPendingAndroid(): Promise<void>;
  export function getSubscriptions(skus: { skus: string[] } | string[]): Promise<any>;
  export function requestSubscription(sku: string): Promise<any>;
  export function requestSubscription(options: {
    sku: string;
    subscriptionOffers?: Array<{
      sku: string;
      offerToken: string;
    }>;
  }): Promise<any>;
}
