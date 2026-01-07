import React from 'react';
import { Linking, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

const COLORS = {
  telegramBlue: '#229ED9',
  telegramGlow: '#38bdf8',
  text: '#ffffff',
};

type TelegramBannerProps = {
  style?: StyleProp<ViewStyle>;
};

const TELEGRAM_URL = 'https://t.me/naksiranalysis';

const TelegramBanner: React.FC<TelegramBannerProps> = ({ style }) => (
  <TouchableOpacity
    style={[styles.button, style]}
    onPress={() => Linking.openURL(TELEGRAM_URL)}
    activeOpacity={0.88}
  >
    <Text style={styles.text}>Join Naksir Analysis on Telegram</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.telegramBlue,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.telegramGlow,
    shadowColor: COLORS.telegramGlow,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 6,
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
});

export default TelegramBanner;
