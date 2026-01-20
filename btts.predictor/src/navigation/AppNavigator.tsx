import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator, { navigationTheme } from './DrawerNavigator';

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <DrawerNavigator />
    </NavigationContainer>
  );
}
