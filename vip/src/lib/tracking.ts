import { init, track } from '@amplitude/analytics-react-native';

const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '';

export const initAnalytics = async () => {
  if (!apiKey) return;
  try {
    await init(apiKey);
  } catch (error) {
    console.warn('Amplitude init failed', error);
  }
};

export const trackEvent = async (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  try {
    await track(eventName, properties ?? {});
  } catch (error) {
    console.warn('Amplitude track failed', error);
  }
};
