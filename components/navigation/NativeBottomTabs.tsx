// =============================================================================
// Imports
// =============================================================================
import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
  NativeBottomTabNavigationOptions,
  NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';

// =============================================================================
// Native Bottom Tab Navigator
// =============================================================================

/**
 * Creates a native bottom tab navigator using react-native-bottom-tabs.
 *
 * This provides truly native tab bars:
 * - iOS: UITabBarController with native blur, haptics, and animations
 * - Android: BottomNavigationView with Material Design styling
 *
 * Benefits over JS-based tabs (@react-navigation/bottom-tabs):
 * - Native performance and animations
 * - Platform-consistent behavior
 * - Native blur effects on iOS
 * - Proper safe area handling
 */
const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

/**
 * Native bottom tabs wrapped with Expo Router's layout context.
 *
 * This allows using native bottom tabs with Expo Router's file-based routing.
 * Use this instead of the default `Tabs` from expo-router for native tab bars.
 *
 * @example
 * ```tsx
 * import { NativeTabs } from '@/components/navigation/NativeBottomTabs';
 *
 * export default function TabLayout() {
 *   return (
 *     <NativeTabs>
 *       <NativeTabs.Screen
 *         name="index"
 *         options={{
 *           title: 'Home',
 *           tabBarIcon: () => ({ sfSymbol: 'house.fill' }),
 *         }}
 *       />
 *     </NativeTabs>
 *   );
 * }
 * ```
 */
export const NativeTabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(BottomTabNavigator);

// =============================================================================
// Exports
// =============================================================================
export type { NativeBottomTabNavigationOptions };
