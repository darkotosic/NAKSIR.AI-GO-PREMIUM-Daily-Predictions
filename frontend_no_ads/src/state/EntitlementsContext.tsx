import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchEntitlements } from '@api/billing';
import { SUBS_SKUS } from '@shared/billing_skus';

type EntitlementsState = {
  loading: boolean;
  entitled: boolean;
  plan?: string;
  expiresAt?: string;
  freeRewardUsed?: boolean;
  isPremium: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EntitlementsState | null>(null);

function isPremiumPlan(entitled: boolean, plan?: string) {
  if (!entitled) return false;
  if (!plan) return false;
  return (SUBS_SKUS as readonly string[]).includes(plan);
}

export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [entitled, setEntitled] = useState(false);
  const [plan, setPlan] = useState<string | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [freeRewardUsed, setFreeRewardUsed] = useState<boolean | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetchEntitlements();
      setEntitled(!!r.entitled);
      setPlan(r.plan);
      setExpiresAt(r.expiresAt);
      setFreeRewardUsed(r.freeRewardUsed);
    } catch {
      // fail closed: treat as not premium if we cannot confirm
      setEntitled(false);
      setPlan(undefined);
      setExpiresAt(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<EntitlementsState>(() => {
    const premium = isPremiumPlan(entitled, plan);
    return { loading, entitled, plan, expiresAt, freeRewardUsed, isPremium: premium, refresh };
  }, [loading, entitled, plan, expiresAt, freeRewardUsed, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useEntitlements() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return v;
}
