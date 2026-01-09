import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { getAdUnitId } from './admob';

/**
 * Growth-first banner:
 * - Bottom sticky
 * - No layout jumping: caller reserves height
 * - Uses test ID in dev
 */
export const BANNER_RESERVED_HEIGHT = 60; // conservative reserve to avoid CLS

type Props = {
  adUnitId?: string;
  isTestMode?: boolean;
};

const BannerAdSticky: React.FC<Props> = ({ adUnitId, isTestMode = __DEV__ }) => {
  const resolvedAdUnitId = useMemo(
    () => adUnitId ?? getAdUnitId('banner', isTestMode),
    [adUnitId, isTestMode],
  );

  return (
    <View style={styles.container} pointerEvents="auto">
      <BannerAd
        unitId={resolvedAdUnitId}
        // Prefer adaptive banner for fill; fallback to standard banner if not available.
        size={(BannerAdSize as any).ANCHORED_ADAPTIVE_BANNER ?? BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default BannerAdSticky;
