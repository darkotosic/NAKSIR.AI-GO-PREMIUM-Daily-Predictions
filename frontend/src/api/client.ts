import axios, { AxiosError } from 'axios';
import { getOrCreateInstallId } from '@lib/installId';

const env = process.env as Record<string, string | undefined>;
const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'https://naksir-go-premium-api.onrender.com';
const apiAuthToken = env.EXPO_PUBLIC_API_KEY?.trim();

const extractErrorMessage = (error: AxiosError): string => {
  const detail = (error.response?.data as any)?.detail;

  if (typeof detail === 'string' && detail.length > 0) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg as string;
        if (item?.loc && item?.msg) return `${(item.loc as (string | number)[]).join('.')}: ${item.msg}`;
        return undefined;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  if (typeof (error.response?.data as any)?.message === 'string') {
    return (error.response?.data as any).message as string;
  }

  if (error.response?.status === 401) {
    return 'Authorization failed. Check your API key and try again.';
  }

  return error.message || 'Request failed. Please try again later.';
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  const installId = await getOrCreateInstallId();
  config.headers = {
    ...(config.headers || {}),
    'X-Install-Id': installId,
  };

  if (apiAuthToken) {
    config.headers['X-API-Key'] = apiAuthToken;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(new Error(extractErrorMessage(error)));
    }
    return Promise.reject(error);
  },
);
