import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DrawerNavigator from '@navigation/DrawerNavigator';
import { initAnalytics } from '@lib/tracking';

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

export default App;
