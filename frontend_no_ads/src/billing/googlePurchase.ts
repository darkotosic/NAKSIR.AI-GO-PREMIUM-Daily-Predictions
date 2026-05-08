import * as Application from 'expo-application';

type AnyPurchase = Record<string, any>;

export type GooglePurchasePayload = {
  packageName: string;
  productId: string;
  purchaseToken: string;
};

export function extractGooglePurchasePayload(purchase: AnyPurchase): GooglePurchasePayload {
  const purchaseToken =
    purchase?.purchaseToken ||
    purchase?.token ||
    purchase?.transactionReceiptToken ||
    purchase?.purchaseTokenAndroid;

  const productId =
    purchase?.productId ||
    purchase?.productIdAndroid ||
    purchase?.sku ||
    purchase?.productIdentifier;

  const envPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE;
  const appId = (Application as any)?.applicationId as string | undefined;

  const packageName = envPackage || appId || '';

  if (!packageName) throw new Error('Missing packageName (set EXPO_PUBLIC_ANDROID_PACKAGE)');
  if (!productId) throw new Error('Missing productId/sku from purchase object');
  if (!purchaseToken) throw new Error('Missing purchaseToken from purchase object');

  return { packageName, productId, purchaseToken };
}
