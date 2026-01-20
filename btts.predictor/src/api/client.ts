export type ApiErrorDetail = {
  detail?: string | { msg?: string; type?: string } | Array<{ msg?: string }>;
};

const getEnv = (key: 'EXPO_PUBLIC_API_BASE_URL' | 'EXPO_PUBLIC_CLIENT_KEY' | 'EXPO_PUBLIC_APP_ID') => {
  return process.env[key];
};

const requireEnv = (key: 'EXPO_PUBLIC_API_BASE_URL' | 'EXPO_PUBLIC_CLIENT_KEY' | 'EXPO_PUBLIC_APP_ID') => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getBaseUrl = () => requireEnv('EXPO_PUBLIC_API_BASE_URL');

const buildHeaders = () => ({
  Accept: 'application/json',
  'X-App-Id': requireEnv('EXPO_PUBLIC_APP_ID'),
  'X-Client-Key': requireEnv('EXPO_PUBLIC_CLIENT_KEY'),
});

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
  const baseUrl = getBaseUrl();
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
