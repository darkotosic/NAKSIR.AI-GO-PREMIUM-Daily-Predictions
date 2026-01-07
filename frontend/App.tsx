import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@navigation/RootNavigator';
import { navigationTheme } from '@navigation/theme';
import { initAnalytics } from '@lib/tracking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import BannerAdSticky, { BANNER_RESERVED_HEIGHT } from '@ads/BannerAdSticky';
import { configureMobileAds } from '@ads/admob';
import AppOpenAdManager from '@ads/AppOpenAdManager';

const queryClient = new QueryClient();

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
      <View style={{ flex: 1, paddingBottom: reservedHeight }}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          {adsReady ? <AppOpenAdManager /> : null}
          <RootNavigator />
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
    </QueryClientProvider>
  );
};

const App: React.FC = () => (
  <SafeAreaProvider>
    <AppRoot />
  </SafeAreaProvider>
);

export default App;
