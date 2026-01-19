import 'react-native-gesture-handler';
import React from 'react';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import OneSignal from 'react-native-onesignal';
import DrawerNavigator from '@navigation/DrawerNavigator';
import { navigationRef } from '@navigation/RootNavigation';
import { navigationTheme } from '@navigation/theme';
import { initAnalytics } from '@lib/tracking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import BannerAdSticky, { BANNER_RESERVED_HEIGHT } from '@ads/BannerAdSticky';
import { configureMobileAds } from '@ads/admob';
import AppOpenAdManager from '@ads/AppOpenAdManager';
import { InterstitialProvider } from '@ads/InterstitialProvider';
import { initConsent } from '@ads/consent';
import { EntitlementsProvider, useEntitlements } from '@state/EntitlementsContext';

const queryClient = new QueryClient();
const ONESIGNAL_APP_ID =
  process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
  '';

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
    // Minimal logging; can be expanded to Sentry later
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
  const insets = useSafeAreaInsets();
  const { isPremium } = useEntitlements();

  const reservedHeight = (isPremium ? 0 : BANNER_RESERVED_HEIGHT) + insets.bottom;

  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    initAnalytics();

    // Premium = no ads (do not init SDK, do not request consent, do not render placements)
    if (isPremium) {
      setAdsReady(false);
      return;
    }

    let isMounted = true;

    const initAds = async () => {
      try {
        const consent = await initConsent();
        if (!consent.canRequestAds) {
          if (isMounted) setAdsReady(false);
          return;
        }
        await configureMobileAds({ isTestMode: __DEV__ });
      } catch {
        // swallow
      } finally {
        if (isMounted) setAdsReady(true);
      }
    };

    initAds();

    return () => {
      isMounted = false;
    };
  }, [isPremium]);

  const appContent = (
    <View
      style={{
        flex: 1,
        paddingBottom: reservedHeight,
        backgroundColor: '#040312',
      }}
    >
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar style="light" />
        {!isPremium && adsReady ? <AppOpenAdManager /> : null}
        <DrawerNavigator />
      </NavigationContainer>

      {!isPremium && adsReady ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: reservedHeight,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: insets.bottom,
          }}
        >
          <BannerAdSticky />
        </View>
      ) : null}
    </View>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {!isPremium && adsReady ? <InterstitialProvider>{appContent}</InterstitialProvider> : appContent}
    </QueryClientProvider>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    if (!ONESIGNAL_APP_ID) return;

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Android 13+ / general permission prompt where applicable
    OneSignal.Notifications.requestPermission(true);

    // Optional: verbose logs during dev
    // OneSignal.Debug.setLogLevel(6);
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
