import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { COLORS } from '@navigation/theme';

type Props = MaterialTopTabBarProps & {
  topInset?: number;
};

type LayoutMap = Record<string, { x: number; width: number }>;

function NeonTopTabBar(props: Props) {
  const { state, descriptors, navigation, topInset = 0 } = props;

  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const layouts = useRef<LayoutMap>({});

  const routes = state.routes;

  const labels = useMemo(
    () =>
      routes.map((route) => {
        const options = descriptors[route.key]?.options;
        const label =
          options?.tabBarLabel ?? options?.title ?? (route.name as string);
        return String(label).toUpperCase();
      }),
    [routes, descriptors]
  );

  const onItemLayout = (routeKey: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[routeKey] = { x, width };

    // Initialize indicator on first layout for active route
    const activeKey = routes[state.index]?.key;
    if (routeKey === activeKey) {
      indicatorX.setValue(x);
      indicatorW.setValue(width);
    }
  };

  useEffect(() => {
    const activeKey = routes[state.index]?.key;
    const m = layouts.current[activeKey];
    if (!m) return;

    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: m.x,
        useNativeDriver: true,
        stiffness: 260,
        damping: 26,
        mass: 0.9,
      }),
      Animated.spring(indicatorW, {
        toValue: m.width,
        useNativeDriver: false,
        stiffness: 260,
        damping: 26,
        mass: 0.9,
      }),
    ]).start();
  }, [state.index, routes, indicatorX, indicatorW]);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(8, topInset + 8) }]}>
      <View style={styles.shell}>
        {/* Active pill */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              width: indicatorW,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        >
          <View style={styles.activeGlowOuter} />
          <View style={styles.activeGlowInner} />
        </Animated.View>

        {routes.map((route, idx) => {
          const focused = state.index === idx;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={onItemLayout(route.key)}
              android_ripple={{
                color: 'rgba(176,107,255,0.18)',
                borderless: false,
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
                // keep active hitbox consistent; visuals handled by pill
              ]}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={labels[idx]}
            >
              <Text
                numberOfLines={1}
                style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
              >
                {labels[idx]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* subtle divider */}
      <View style={styles.divider} />
    </View>
  );
}

export default memo(NeonTopTabBar);

const TAB_HEIGHT = 44;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
  },
  shell: {
    marginHorizontal: 12,
    height: TAB_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,0,196,0.55)',
    backgroundColor: 'rgba(11,12,31,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    overflow: 'hidden', // critical: no clipping issues inside, pill contained
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.18)', // glassy base
    borderWidth: 1,
    borderColor: 'rgba(176,107,255,0.55)',
  },
  activeGlowOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    shadowColor: COLORS.neonViolet,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  activeGlowInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    shadowColor: COLORS.neonOrange,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? 0 : 0,
  },
  item: {
    flex: 1,
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  itemPressed: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  labelActive: {
    color: COLORS.text,
    textShadowColor: 'rgba(176,107,255,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  labelInactive: {
    color: 'rgba(248,250,252,0.78)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139,92,246,0.20)',
    marginTop: 10,
  },
});
