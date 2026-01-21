export type ApiErrorDetail = {
  detail?: string | { msg?: string; type?: string } | Array<{ msg?: string }>;
};

// ✅ Expo can inline these (static access)
const EXPO_PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const EXPO_PUBLIC_APP_ID = process.env.EXPO_PUBLIC_APP_ID;
const EXPO_PUBLIC_CLIENT_KEY = process.env.EXPO_PUBLIC_CLIENT_KEY;
// Optional if you use it
const EXPO_PUBLIC_API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const requireEnvSet = () => {
  const missing: string[] = [];
  if (!EXPO_PUBLIC_API_BASE_URL) missing.push('EXPO_PUBLIC_API_BASE_URL');
  if (!EXPO_PUBLIC_CLIENT_KEY) missing.push('EXPO_PUBLIC_CLIENT_KEY');
  if (!EXPO_PUBLIC_APP_ID) missing.push('EXPO_PUBLIC_APP_ID');

  if (missing.length) {
    throw new Error(`Missing ${missing.join(' / ')}`);
  }
};

export const getApiBaseUrl = () => {
  requireEnvSet();
  return String(EXPO_PUBLIC_API_BASE_URL).replace(/\/$/, '');
};

export const getApiKey = () => (EXPO_PUBLIC_API_KEY ? String(EXPO_PUBLIC_API_KEY) : undefined);

export const getClientKey = () => {
  requireEnvSet();
  return String(EXPO_PUBLIC_CLIENT_KEY);
};

export const getAppId = () => {
  requireEnvSet();
  return String(EXPO_PUBLIC_APP_ID);
};

const buildHeaders = () => {
  const appId = getAppId();
  const clientKey = getClientKey();
  return {
    Accept: 'application/json',
    'X-App-Id': appId,

    // Backend auth header (primary)
    'X-API-Key': clientKey,

    // Backward-compat / alias
    'X-Client-Key': clientKey,
  };
};

const parseErrorDetail = (payload: ApiErrorDetail) => {
  if (!payload || !payload.detail) {
    return 'Unknown error';
  }
  if (typeof payload.detail === 'string') {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg).filter(Boolean).join(', ') || 'Unknown error';
  }
  return payload.detail.msg || 'Unknown error';
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    let detail = 'Unknown error';
    try {
      const payload = (await response.json()) as ApiErrorDetail;
      detail = parseErrorDetail(payload);
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(`[${response.status}] ${detail}`);
  }

  return (await response.json()) as T;
};
