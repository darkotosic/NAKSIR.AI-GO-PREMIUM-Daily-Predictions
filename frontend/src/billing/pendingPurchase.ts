// frontend/src/billing/pendingPurchase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PendingPurchase = {
  purchaseToken: string;
  productId: string;
  packageName?: string;
  transactionId?: string;
  createdAt: number; // epoch ms
};

const KEY = "billing.pendingPurchase.v1";

export async function savePendingPurchase(p: PendingPurchase): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

export async function loadPendingPurchase(): Promise<PendingPurchase | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPurchase;
  } catch {
    return null;
  }
}

export async function clearPendingPurchase(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
