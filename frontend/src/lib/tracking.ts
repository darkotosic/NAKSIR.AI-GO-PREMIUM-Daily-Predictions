import * as Amplitude from 'expo-analytics-amplitude';

const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '';

export const initAnalytics = async () => {
  if (!apiKey) return;
  try {
    await Amplitude.initializeAsync(apiKey);
  } catch (error) {
    // Fail silently for analytics init
    console.warn('Amplitude init failed', error);
  }
};

export const trackEvent = async (eventName: string, properties?: Record<string, unknown>) => {
  try {
    await Amplitude.logEventWithPropertiesAsync(eventName, properties || {});
  } catch (error) {
    // Avoid throwing inside analytics helpers
    console.warn('Amplitude track failed', error);
  }
};
