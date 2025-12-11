import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from 'sentry-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DrawerNavigator from '@navigation/DrawerNavigator';
import { initAnalytics } from '@lib/tracking';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enableInExpoDevelopment: true,
  debug: __DEV__,
});

const queryClient = new QueryClient();

const App: React.FC = () => {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <DrawerNavigator />
    </QueryClientProvider>
  );
};

export default Sentry.Native.wrap(App);
