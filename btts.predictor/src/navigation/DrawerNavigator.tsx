import { Linking } from 'react-native';
import { DefaultTheme } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RateAppButton from '../components/RateAppButton';
import { openRateApp } from '../lib/rateApp';
import SettingsScreen from '../screens/SettingsScreen';
import TicketsScreen from '../screens/TicketsScreen';
import TodayScreen from '../screens/TodayScreen';
import TomorrowScreen from '../screens/TomorrowScreen';
import Top3Screen from '../screens/Top3Screen';

const COLORS = {
  background: '#040312',
  card: '#0b0c1f',
  neonPurple: '#b06bff',
  neonViolet: '#8b5cf6',
  neonGreen: '#00ff5e',
  text: '#f8fafc',
  borderSoft: '#1f1f3a',
};

const legalLinks = [
  { label: 'Terms of Use', url: 'https://naksirpredictions.top/terms-of-use' },
  { label: 'Privacy Policy', url: 'https://naksirpredictions.top/privacy-policy' },
  { label: 'Legal Disclaimer', url: 'https://naksirpredictions.top/legal-disclaimer' },
  { label: 'Naksir Website', url: 'https://naksirpredictions.top' },
  {
    label: 'Naksir Apps',
    url: 'https://play.google.com/store/apps/dev?id=6165954326742483653',
  },
  { label: 'Telegram', url: 'https://t.me/naksiranalysis' },
];

type DrawerParamList = {
  Today: undefined;
  Tomorrow: undefined;
  Top3: undefined;
  Tickets: undefined;
  Settings: undefined;
};

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: COLORS.background }}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Rate app"
        labelStyle={{ color: COLORS.text, fontWeight: '800' }}
        onPress={openRateApp}
      />
      <DrawerItem
        label="Links"
        labelStyle={{ color: COLORS.text, fontWeight: '700' }}
        onPress={() => null}
        style={{ display: 'none' }}
      />
      {legalLinks.map((link) => (
        <DrawerItem
          key={link.label}
          label={link.label}
          labelStyle={{ color: COLORS.text, fontWeight: '700' }}
          onPress={() => Linking.openURL(link.url)}
        />
      ))}
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator<DrawerParamList>();

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    primary: COLORS.neonGreen,
    text: COLORS.text,
    border: COLORS.borderSoft,
  },
};

export default function DrawerNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer.Navigator
        initialRouteName="Today"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          drawerActiveTintColor: COLORS.neonGreen,
          drawerInactiveTintColor: COLORS.text,
          drawerStyle: { backgroundColor: COLORS.background },
          headerRight: () => <RateAppButton style={{ marginRight: 12 }} />,
        }}
      >
        <Drawer.Screen name="Today" component={TodayScreen} options={{ title: "Today's matches" }} />
        <Drawer.Screen name="Tomorrow" component={TomorrowScreen} options={{ title: 'Tomorrow matches' }} />
        <Drawer.Screen name="Top3" component={Top3Screen} options={{ title: 'Top 3 matches today' }} />
        <Drawer.Screen name="Tickets" component={TicketsScreen} options={{ title: 'BTTS YES & NO Tickets' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Drawer.Navigator>
    </GestureHandlerRootView>
  );
}
