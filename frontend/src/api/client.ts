import axios from 'axios';
import { getOrCreateInstallId } from '@lib/installId';

export const apiClient = axios.create({
  baseURL: 'https://naksir-go-premium-api.onrender.com',
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const installId = await getOrCreateInstallId();
  config.headers = {
    ...(config.headers || {}),
    'X-Install-Id': installId,
  };
  return config;
});
