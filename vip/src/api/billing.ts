import { apiClient } from './client';

export type EntitlementResponse = {
  entitled: boolean;
  expiresAt?: string;
  plan?: string;
  freeRewardUsed?: boolean;
};

export const verifyGooglePurchase = async (params: {
  packageName: string;
  productId: string;
  purchaseToken: string;
}): Promise<EntitlementResponse> => {
  const { data } = await apiClient.post<EntitlementResponse>('/billing/google/verify', params);
  return data;
};

export const fetchEntitlements = async (): Promise<EntitlementResponse> => {
  const { data } = await apiClient.get<EntitlementResponse>('/me/entitlements');
  return data;
};
