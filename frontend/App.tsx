import 'react-native-gesture-handler';
import React from 'react';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from '@navigation/DrawerNavigator';
import { navigationTheme } from '@navigation/theme';
import { initAnalytics } from '@lib/tracking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import BannerAdSticky, { BANNER_RESERVED_HEIGHT } from '@ads/BannerAdSticky';
import { configureMobileAds } from '@ads/admob';
import AppOpenAdManager from '@ads/AppOpenAdManager';
import { InterstitialProvider } from '@ads/InterstitialProvider';
import { initConsent } from '@ads/consent';

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
  const reservedHeight = BANNER_RESERVED_HEIGHT + insets.bottom;
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    initAnalytics();
    // Ensures ads SDK is configured + initialized ASAP.
    // NOTE: android app id is injected via expo config plugin (withAdMobAppId).
    let isMounted = true;
    const initAds = async () => {
      try {
        // 1) Consent first (TCF/UMP)
        const consent = await initConsent();

        // If Google says we cannot request ads, do not init ads.
        if (!consent.canRequestAds) {
          if (isMounted) setAdsReady(false);
          return;
        }

        // 2) Initialize Mobile Ads SDK after consent
        await configureMobileAds({ isTestMode: __DEV__ });
      } catch {
        // Swallow ads errors so the app can still render content.
      } finally {
        if (isMounted) {
          setAdsReady(true);
        }
      }
    };

    initAds();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <InterstitialProvider>
        <View
          style={{
            flex: 1,
            paddingBottom: reservedHeight,
            backgroundColor: '#040312',
          }}
        >
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="light" />
            {adsReady ? <AppOpenAdManager /> : null}
            <DrawerNavigator />
          </NavigationContainer>

          {/* Bottom sticky banner (single placement, no popups) */}
          {adsReady ? (
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
      </InterstitialProvider>
    </QueryClientProvider>
  );
};

const App: React.FC = () => (
  <SafeAreaProvider>
    <RootErrorBoundary>
      <AppRoot />
    </RootErrorBoundary>
  </SafeAreaProvider>
);

export default App;
