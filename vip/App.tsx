import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import DrawerNavigator from '@navigation/DrawerNavigator';
import { navigationRef } from '@navigation/RootNavigation';
import { navigationTheme } from '@navigation/theme';
import { initAnalytics } from '@lib/tracking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { EntitlementsProvider } from '@state/EntitlementsContext';

const queryClient = new QueryClient();

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    console.log('RootErrorBoundary:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: '#040312',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <Text
            style={{
              color: '#fb923c',
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 12,
            }}
          >
            App failed to start
          </Text>
          <Text selectable style={{ color: '#f8fafc', marginBottom: 16 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#b06bff',
            }}
          >
            <Text style={{ color: '#b06bff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children as any;
  }
}

const AppRoot: React.FC = () => {
  React.useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, backgroundColor: '#040312' }}>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <StatusBar style="light" />
          <DrawerNavigator />
        </NavigationContainer>
      </View>
    </QueryClientProvider>
  );
};

const App: React.FC = () => {
  const initOneSignal = () => {
    try {
      const appId =
        process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ??
        (Constants.expoConfig?.extra as any)?.oneSignalAppId;

      if (!appId) {
        console.warn('[OneSignal] Missing EXPO_PUBLIC_ONESIGNAL_APP_ID -> skipping init');
        return;
      }

      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(appId);
      OneSignal.Notifications.requestPermission(true);
      console.log('[OneSignal] initialized');
    } catch (e) {
      console.warn('[OneSignal] init failed (non-fatal):', e);
    }
  };

  React.useEffect(() => {
    initOneSignal();
  }, []);

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <EntitlementsProvider>
          <AppRoot />
        </EntitlementsProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
};

export default App;
