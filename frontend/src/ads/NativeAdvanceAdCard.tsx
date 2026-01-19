// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { useEntitlements } from '@state/EntitlementsContext';

import { getAdUnitId } from './admob';

interface NativeAdvanceAdCardProps {
  adUnitId?: string;
  isTestMode?: boolean;
}

export const NativeAdvanceAdCard: React.FC<NativeAdvanceAdCardProps> = ({
  adUnitId,
  isTestMode = __DEV__,
}) => {
  const { isPremium } = useEntitlements();

  // Premium = absolutely no ads
  if (isPremium) {
    return null;
  }

  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const resolvedAdUnitId = useMemo(
    () => adUnitId ?? getAdUnitId('nativeAdvanced', isTestMode),
    [adUnitId, isTestMode],
  );

  useEffect(() => {
    let isActive = true;
    let adInstance: NativeAd | null = null;

    setNativeAd(null);

    NativeAd.createForAdRequest(resolvedAdUnitId)
      .then((ad) => {
        adInstance = ad;
        if (isActive) {
          setNativeAd(ad);
        } else {
          ad.destroy();
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('Failed to load native ad', error);
        }
      });

    return () => {
      isActive = false;
      adInstance?.destroy();
    };
  }, [resolvedAdUnitId]);

  if (!nativeAd) {
    return null;
  }

  return (
    <NativeAdView style={styles.container} nativeAd={nativeAd}>
      <View style={styles.innerCard}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
        <NativeMediaView style={styles.media} />
        <View style={styles.row}>
          {nativeAd.icon?.url ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          ) : null}
          <View style={styles.textBlock}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline}>{nativeAd.headline}</Text>
            </NativeAsset>
            {nativeAd.body ? (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.tagline} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
          </View>
        </NativeAsset>
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
  adBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adBadgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
