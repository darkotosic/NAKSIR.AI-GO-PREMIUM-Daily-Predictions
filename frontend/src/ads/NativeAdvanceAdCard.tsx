// @ts-nocheck
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import NativeAdView, {
  CallToActionView,
  HeadlineView,
  IconView,
  MediaView,
  TaglineView,
} from 'react-native-google-mobile-ads/native-ads';

import { getAdUnitId } from './admob';

interface NativeAdvanceAdCardProps {
  adUnitId?: string;
  isTestMode?: boolean;
}

export const NativeAdvanceAdCard: React.FC<NativeAdvanceAdCardProps> = ({
  adUnitId,
  isTestMode = __DEV__,
}) => {
  const resolvedAdUnitId = useMemo(
    () => adUnitId ?? getAdUnitId('nativeAdvanced', isTestMode),
    [adUnitId, isTestMode],
  );

  return (
    <NativeAdView style={styles.container} adUnitID={resolvedAdUnitId} videoOptions={{ muted: true }}>
      <View style={styles.innerCard}>
        <MediaView style={styles.media} />
        <View style={styles.row}>
          <IconView style={styles.icon} />
          <View style={styles.textBlock}>
            <HeadlineView style={styles.headline} />
            <TaglineView style={styles.tagline} numberOfLines={2} />
          </View>
        </View>
        <CallToActionView style={styles.cta} textStyle={styles.ctaText} />
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f4f6fb',
  },
  innerCard: {
    padding: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  media: {
    height: 180,
    borderRadius: 10,
    backgroundColor: '#dfe3ed',
  },
  icon: {
    height: 56,
    width: 56,
    borderRadius: 10,
    backgroundColor: '#dfe3ed',
  },
  headline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  tagline: {
    fontSize: 13,
    color: '#475569',
  },
  cta: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  ctaText: {
    color: '#f8fafc',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
