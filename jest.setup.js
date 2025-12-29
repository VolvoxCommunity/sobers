// Mock React Native
jest.mock('react-native', () => {
  const React = require('react');

  const View = ({ children, ...props }) => React.createElement('View', props, children);
  const Text = ({ children, ...props }) => React.createElement('Text', props, children);
  const TextInput = (props) => React.createElement('TextInput', props);
  const TouchableOpacity = ({ children, onPress, ...props }) =>
    React.createElement('TouchableOpacity', { onPress, ...props }, children);
  const ScrollView = ({ children, ...props }) => React.createElement('ScrollView', props, children);
  const KeyboardAvoidingView = ({ children, ...props }) =>
    React.createElement('KeyboardAvoidingView', props, children);
  const Modal = ({ children, visible, ...props }) =>
    visible ? React.createElement('Modal', props, children) : null;
  const Pressable = ({ children, onPress, ...props }) =>
    React.createElement('Pressable', { onPress, ...props }, children);
  const Switch = ({ value, onValueChange, ...props }) =>
    React.createElement('Switch', { value, onValueChange, ...props });

  // Mock Animated for AnimatedBottomNav and other animated components
  class MockAnimatedValue {
    constructor(value) {
      this._value = value;
    }
    setValue(value) {
      this._value = value;
    }
  }

  const Animated = {
    View: ({ children, style, ...props }) =>
      React.createElement('View', { ...props, style }, children),
    Text: ({ children, style, ...props }) =>
      React.createElement('Text', { ...props, style }, children),
    Value: MockAnimatedValue,
    timing: (value, config) => ({
      start: (callback) => {
        if (value && value._value !== undefined) {
          value._value = config.toValue;
        }
        callback && callback();
      },
    }),
    sequence: (animations) => ({
      start: (callback) => {
        animations.forEach((anim) => anim.start && anim.start());
        callback && callback();
      },
    }),
    parallel: (animations) => ({
      start: (callback) => {
        animations.forEach((anim) => anim.start && anim.start());
        callback && callback();
      },
    }),
    spring: (_value, _config) => ({
      start: (callback) => {
        callback && callback();
      },
    }),
    event: () => jest.fn(),
  };

  return {
    Platform: {
      OS: 'ios',
      select: (obj) => obj.ios,
      Version: 18,
    },
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
    },
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    Switch,
    Animated,
    ActivityIndicator: ({ size, color, ...props }) =>
      React.createElement('ActivityIndicator', { size, color, ...props }),
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn().mockResolvedValue(true),
      canOpenURL: jest.fn().mockResolvedValue(true),
      getInitialURL: jest.fn().mockResolvedValue(null),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    useColorScheme: jest.fn(() => 'light'),
    useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
    LayoutAnimation: {
      configureNext: jest.fn(),
      Presets: {
        easeInEaseOut: {},
        linear: {},
        spring: {},
      },
      Types: {
        spring: 'spring',
        linear: 'linear',
        easeInEaseOut: 'easeInEaseOut',
        easeIn: 'easeIn',
        easeOut: 'easeOut',
        keyboard: 'keyboard',
      },
      Properties: {
        opacity: 'opacity',
        scaleX: 'scaleX',
        scaleY: 'scaleY',
        scaleXY: 'scaleXY',
      },
      create: jest.fn(),
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => {
        callback();
        return { cancel: jest.fn() };
      }),
      createInteractionHandle: jest.fn(() => 1),
      clearInteractionHandle: jest.fn(),
      setDeadline: jest.fn(),
    },
    // BackHandler mock for Android back button testing
    // Tests can access the listeners via global.__backHandlerListeners
    BackHandler: {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'hardwareBackPress') {
          if (!global.__backHandlerListeners) {
            global.__backHandlerListeners = [];
          }
          global.__backHandlerListeners.push(handler);
        }
        return {
          remove: jest.fn(() => {
            if (global.__backHandlerListeners) {
              const index = global.__backHandlerListeners.indexOf(handler);
              if (index > -1) {
                global.__backHandlerListeners.splice(index, 1);
              }
            }
          }),
        };
      }),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },
  };
});

// Mock processColor
global.processColor = (color) => color;

// Define __DEV__ for tests
global.__DEV__ = false;

// Mock document for web platform tests (keyboard event handling, DOM access, etc.)
// This provides a more complete mock to avoid errors when code accesses document properties.
// Note: Jest is configured to use the 'node' environment (see CLAUDE.md), so jsdom is not available.
// This manual mock provides basic document functionality for compatibility in tests.
global.document = {
  // Event handling
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),

  // DOM queries (return null/empty to simulate no matches)
  getElementById: jest.fn(() => null),
  getElementsByClassName: jest.fn(() => []),
  getElementsByTagName: jest.fn(() => []),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),

  // Document properties
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    style: {},
  },
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
  documentElement: {
    style: {},
  },

  // Element creation
  createElement: jest.fn((tagName) => ({
    tagName,
    style: {},
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  createTextNode: jest.fn((text) => ({ textContent: text })),

  // Document state
  readyState: 'complete',
  visibilityState: 'visible',
  hidden: false,
};

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
    useNavigation: () => ({
      setOptions: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useSegments: () => [],
    usePathname: () => '/',
    Link: ({ children, ..._props }) => children,
    Slot: ({ children }) => children,
    Stack: ({ children }) => children,
    Tabs: ({ children }) => children,
    // useFocusEffect runs the callback immediately (simulating focused state)
    useFocusEffect: (callback) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');

  return {
    signInAsync: jest.fn(),
    AppleAuthenticationScope: {
      FULL_NAME: 0,
      EMAIL: 1,
    },
    AppleAuthenticationButtonType: {
      SIGN_IN: 0,
      CONTINUE: 1,
      SIGN_UP: 2,
    },
    AppleAuthenticationButtonStyle: {
      WHITE: 0,
      WHITE_OUTLINE: 1,
      BLACK: 2,
    },
    AppleAuthenticationButton: ({ onPress, ...props }) =>
      React.createElement(
        TouchableOpacity,
        { testID: 'apple-auth-button', onPress, ...props },
        React.createElement(Text, null, 'Sign in with Apple')
      ),
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  openURL: jest.fn(() => Promise.resolve(true)),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'sobers://auth/callback'),
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ value, onChange: _onChange, mode, display, ...props }) =>
      React.createElement('DateTimePicker', {
        value: value?.toISOString(),
        mode,
        display,
        ...props,
      }),
  };
});

// Mock expo core module
jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(() => false),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.1.0',
    extra: {
      eas: {
        buildNumber: '123',
      },
    },
  },
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  reactNavigationIntegration: jest.fn(() => ({})),
  mobileReplayIntegration: jest.fn(() => ({})),
  feedbackIntegration: jest.fn(() => ({})),
}));

// Mock react-native-url-polyfill to prevent ESM import errors
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock @supabase/supabase-js with chainable query builder
jest.mock('@supabase/supabase-js', () => {
  // Create a chainable query builder
  const createQueryBuilder = () => {
    const builder = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      upsert: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      neq: jest.fn(() => builder),
      gt: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lt: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      like: jest.fn(() => builder),
      ilike: jest.fn(() => builder),
      is: jest.fn(() => builder),
      in: jest.fn(() => builder),
      contains: jest.fn(() => builder),
      containedBy: jest.fn(() => builder),
      rangeGt: jest.fn(() => builder),
      rangeGte: jest.fn(() => builder),
      rangeLt: jest.fn(() => builder),
      rangeLte: jest.fn(() => builder),
      rangeAdjacent: jest.fn(() => builder),
      overlaps: jest.fn(() => builder),
      textSearch: jest.fn(() => builder),
      match: jest.fn(() => builder),
      not: jest.fn(() => builder),
      or: jest.fn(() => builder),
      filter: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      range: jest.fn(() => builder),
      single: jest.fn(() => builder),
      maybeSingle: jest.fn(() => builder),
      csv: jest.fn(() => builder),
      // Promise-like methods for query execution
      then: jest.fn((resolve) => Promise.resolve({ data: null, error: null }).then(resolve)),
      catch: jest.fn((reject) => Promise.resolve({ data: null, error: null }).catch(reject)),
    };
    return builder;
  };

  return {
    createClient: jest.fn(() => ({
      auth: {
        signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
        signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        signInWithOAuth: jest.fn(() =>
          Promise.resolve({ data: { url: '', provider: 'google' }, error: null })
        ),
        setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      },
      from: jest.fn(() => createQueryBuilder()),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };
});

// Mock @/lib/supabase to use the mocked supabase-js client
jest.mock('@/lib/supabase', () => {
  const { createClient } = require('@supabase/supabase-js');
  return {
    supabase: createClient('https://test.supabase.co', 'test-anon-key'),
  };
});

// Mock @/lib/alert platform module
// Uses React Native Alert by default, but switches to window.alert/confirm for web tests
jest.mock('@/lib/alert/platform', () => {
  const { Alert, Platform } = require('react-native');
  return {
    showAlertPlatform: (title, message, buttons) => {
      // Check Platform.OS at runtime to support web tests
      if (Platform.OS === 'web' && typeof global.window?.alert === 'function') {
        const alertText = message ? `${title}: ${message}` : title;
        global.window.alert(alertText);
      } else {
        Alert.alert(title, message, buttons);
      }
    },
    showConfirmPlatform: (
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      destructive = false
    ) => {
      // Check Platform.OS at runtime to support web tests
      if (Platform.OS === 'web' && typeof global.window?.confirm === 'function') {
        const confirmMessage = `${title}\n\n${message}`;
        return Promise.resolve(global.window.confirm(confirmMessage));
      }
      return new Promise((resolve) => {
        Alert.alert(
          title,
          message,
          [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            {
              text: confirmText,
              style: destructive ? 'destructive' : 'default',
              onPress: () => resolve(true),
            },
          ],
          {
            cancelable: true,
            onDismiss: () => resolve(false),
          }
        );
      });
    },
  };
});

// Mock react-native-bottom-tabs
jest.mock('react-native-bottom-tabs', () => {
  const React = require('react');
  return {
    createNativeBottomTabNavigator: () => ({
      Navigator: ({ children, ...props }) => React.createElement('TabNavigator', props, children),
      Screen: ({ children, ...props }) => React.createElement('TabScreen', props, children),
    }),
  };
});

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement('BottomSheet', props, children),
    BottomSheetModal: ({ children, ...props }) =>
      React.createElement('BottomSheetModal', props, children),
    BottomSheetModalProvider: ({ children }) => children,
    BottomSheetView: ({ children, ...props }) =>
      React.createElement('BottomSheetView', props, children),
    BottomSheetScrollView: ({ children, ...props }) =>
      React.createElement('BottomSheetScrollView', props, children),
    BottomSheetBackdrop: ({ children, ...props }) =>
      React.createElement('BottomSheetBackdrop', props, children),
    BottomSheetTextInput: Object.assign(
      React.forwardRef(function BottomSheetTextInput(props, ref) {
        return React.createElement(TextInput, { ...props, ref });
      }),
      { displayName: 'BottomSheetTextInput' }
    ),
    BottomSheetFooter: ({ children, ...props }) =>
      React.createElement('BottomSheetFooter', props, children),
    BottomSheetHandle: (props) => React.createElement('BottomSheetHandle', props),
    // Touchable components for use inside bottom sheets
    TouchableOpacity: ({ children, onPress, ...props }) =>
      React.createElement('TouchableOpacity', { onPress, ...props }, children),
    TouchableHighlight: ({ children, onPress, ...props }) =>
      React.createElement('TouchableHighlight', { onPress, ...props }, children),
    TouchableWithoutFeedback: ({ children, onPress, ...props }) =>
      React.createElement('TouchableWithoutFeedback', { onPress, ...props }, children),
    useBottomSheetModal: () => ({
      dismiss: jest.fn(),
      present: jest.fn(),
    }),
  };
});

// Mock GlassBottomSheet with visibility state tracking
jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle, useState } = React;

  const MockGlassBottomSheet = forwardRef(function MockGlassBottomSheet(
    { children, onDismiss, footerComponent },
    ref
  ) {
    const [isVisible, setIsVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      present: () => setIsVisible(true),
      dismiss: () => {
        setIsVisible(false);
        onDismiss?.();
      },
      snapToIndex: () => {},
    }));

    // Only render children when visible (mimics real bottom sheet behavior)
    if (!isVisible) return null;
    return React.createElement(
      'View',
      { testID: 'glass-bottom-sheet' },
      children,
      // Render footer component if provided
      footerComponent ? footerComponent({ animatedFooterPosition: { value: 0 } }) : null
    );
  });

  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: ({ children, ...props }) => React.createElement('BlurView', props, children),
  };
});

// Mock expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: ({ source, style, contentFit, onLoad, onError, ...props }) =>
      React.createElement('Image', {
        source,
        style,
        contentFit,
        onLoad,
        onError,
        testID: props.testID || 'expo-image',
        ...props,
      }),
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size: _size, color: _color }) =>
      React.createElement(Text, { testID: `icon-${name}` }, `[${name}]`),
    MaterialIcons: ({ name, size: _size, color: _color }) =>
      React.createElement(Text, { testID: `icon-${name}` }, `[${name}]`),
    FontAwesome: ({ name, size: _size, color: _color }) =>
      React.createElement(Text, { testID: `icon-${name}` }, `[${name}]`),
    AntDesign: ({ name, size: _size, color: _color }) =>
      React.createElement(Text, { testID: `icon-${name}` }, `[${name}]`),
    Feather: ({ name, size: _size, color: _color }) =>
      React.createElement(Text, { testID: `icon-${name}` }, `[${name}]`),
  };
});

// Mock react-native-keyboard-controller
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  return {
    KeyboardProvider: ({ children }) => children,
    KeyboardAwareScrollView: ({ children, ...props }) =>
      React.createElement('KeyboardAwareScrollView', props, children),
    KeyboardAvoidingView: ({ children, ...props }) =>
      React.createElement('KeyboardAvoidingView', props, children),
    useKeyboardHandler: () => ({}),
    useReanimatedKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
  };
});

// Mock expo-symbols
jest.mock('expo-symbols', () => {
  const React = require('react');
  return {
    SymbolView: ({ children, ...props }) => React.createElement('SymbolView', props, children),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children, ...props }) =>
      React.createElement('GestureHandlerRootView', props, children),
    PanGestureHandler: ({ children }) => children,
    TapGestureHandler: ({ children }) => children,
    FlingGestureHandler: ({ children }) => children,
    LongPressGestureHandler: ({ children }) => children,
    PinchGestureHandler: ({ children }) => children,
    RotationGestureHandler: ({ children }) => children,
    ScrollView: ({ children, ...props }) => React.createElement('ScrollView', props, children),
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (component) => component,
    Swipeable: ({ children }) => children,
    DrawerLayout: ({ children }) => children,
    TouchableOpacity: ({ children, ...props }) =>
      React.createElement('TouchableOpacity', props, children),
    TouchableHighlight: ({ children, ...props }) =>
      React.createElement('TouchableHighlight', props, children),
    TouchableWithoutFeedback: ({ children, ...props }) =>
      React.createElement('TouchableWithoutFeedback', props, children),
    TouchableNativeFeedback: ({ children, ...props }) =>
      React.createElement('TouchableNativeFeedback', props, children),
  };
});

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 49, // Standard iOS tab bar height (kept for backwards compatibility)
  createBottomTabNavigator: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// lucide-react-native is mocked via moduleNameMapper in jest.config.js

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => {
  const React = require('react');
  const mockToast = ({ config, position, topOffset }) =>
    React.createElement('Toast', { config, position, topOffset });
  mockToast.show = jest.fn();
  mockToast.hide = jest.fn();

  return {
    __esModule: true,
    default: mockToast,
    BaseToast: ({ children, ...props }) => React.createElement('BaseToast', props, children),
  };
});

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  modelName: 'Test Device',
  osName: 'iOS',
  osVersion: '18.0',
  deviceType: 2, // Phone
  isDevice: false,
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeBuildVersion: '100',
  nativeApplicationVersion: '1.0.0',
  applicationId: 'com.test.sobers',
  applicationName: 'Sobers',
}));

// Mock @amplitude/analytics-react-native
jest.mock('@amplitude/analytics-react-native', () => ({
  init: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  reset: jest.fn().mockResolvedValue(undefined),
  Identify: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockReturnThis(),
  })),
  Types: {
    LogLevel: { Debug: 0, None: 4 },
  },
}));

// Mock @amplitude/analytics-browser
jest.mock('@amplitude/analytics-browser', () => ({
  init: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  reset: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockReturnThis(),
  })),
  Types: {
    LogLevel: { Debug: 0, None: 4 },
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  // Mock shared values
  const mockSharedValue = (initialValue) => ({ value: initialValue });

  // Create View component for Animated.View
  // Note: entering, exiting, layout are destructured to prevent them from being passed to native View
  const AnimatedView = React.forwardRef(
    ({ children, entering: _entering, exiting: _exiting, layout: _layout, ...props }, ref) =>
      React.createElement('View', { ...props, ref }, children)
  );
  AnimatedView.displayName = 'Animated.View';

  // Create Text component for Animated.Text
  const AnimatedText = React.forwardRef(
    ({ children, entering: _entering, exiting: _exiting, layout: _layout, ...props }, ref) =>
      React.createElement('Text', { ...props, ref }, children)
  );
  AnimatedText.displayName = 'Animated.Text';

  // Create Image component for Animated.Image
  const AnimatedImage = React.forwardRef(
    ({ entering: _entering, exiting: _exiting, layout: _layout, ...props }, ref) =>
      React.createElement('Image', { ...props, ref })
  );
  AnimatedImage.displayName = 'Animated.Image';

  // Create ScrollView component for Animated.ScrollView
  const AnimatedScrollView = React.forwardRef(
    ({ children, entering: _entering, exiting: _exiting, layout: _layout, ...props }, ref) =>
      React.createElement('ScrollView', { ...props, ref }, children)
  );
  AnimatedScrollView.displayName = 'Animated.ScrollView';

  // Create FlatList component for Animated.FlatList
  const AnimatedFlatList = React.forwardRef(
    ({ children, entering: _entering, exiting: _exiting, layout: _layout, ...props }, ref) =>
      React.createElement('FlatList', { ...props, ref }, children)
  );
  AnimatedFlatList.displayName = 'Animated.FlatList';

  // Mock Animated namespace
  const Animated = {
    View: AnimatedView,
    Text: AnimatedText,
    Image: AnimatedImage,
    ScrollView: AnimatedScrollView,
    FlatList: AnimatedFlatList,
  };

  // Mock animation configurations
  const mockEntering = { duration: jest.fn().mockReturnThis() };
  const mockExiting = { duration: jest.fn().mockReturnThis() };

  return {
    __esModule: true,
    default: Animated,
    // Core hooks
    useSharedValue: mockSharedValue,
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    useAnimatedGestureHandler: jest.fn(() => jest.fn()),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedReaction: jest.fn(),
    useAnimatedProps: jest.fn(() => ({})),
    // Timing functions
    withTiming: jest.fn((toValue) => toValue),
    withSpring: jest.fn((toValue) => toValue),
    withDecay: jest.fn((config) => config?.velocity || 0),
    withDelay: jest.fn((_, animation) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    withRepeat: jest.fn((animation) => animation),
    // Interpolation
    interpolate: jest.fn((value, inputRange, outputRange) => {
      if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] || 0;
      return outputRange[0];
    }),
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    // Easing
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(() => jest.fn()),
      bezierFn: jest.fn(() => jest.fn()),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
    // Layout animations - entering
    FadeIn: mockEntering,
    FadeInUp: mockEntering,
    FadeInDown: mockEntering,
    FadeInLeft: mockEntering,
    FadeInRight: mockEntering,
    SlideInUp: mockEntering,
    SlideInDown: mockEntering,
    SlideInLeft: mockEntering,
    SlideInRight: mockEntering,
    ZoomIn: mockEntering,
    ZoomInDown: mockEntering,
    ZoomInUp: mockEntering,
    BounceIn: mockEntering,
    BounceInDown: mockEntering,
    BounceInUp: mockEntering,
    FlipInXDown: mockEntering,
    FlipInXUp: mockEntering,
    FlipInYLeft: mockEntering,
    FlipInYRight: mockEntering,
    StretchInX: mockEntering,
    StretchInY: mockEntering,
    LightSpeedInLeft: mockEntering,
    LightSpeedInRight: mockEntering,
    PinwheelIn: mockEntering,
    RotateInDownLeft: mockEntering,
    RotateInDownRight: mockEntering,
    RotateInUpLeft: mockEntering,
    RotateInUpRight: mockEntering,
    RollInLeft: mockEntering,
    RollInRight: mockEntering,
    // Layout animations - exiting
    FadeOut: mockExiting,
    FadeOutUp: mockExiting,
    FadeOutDown: mockExiting,
    FadeOutLeft: mockExiting,
    FadeOutRight: mockExiting,
    SlideOutUp: mockExiting,
    SlideOutDown: mockExiting,
    SlideOutLeft: mockExiting,
    SlideOutRight: mockExiting,
    ZoomOut: mockExiting,
    ZoomOutDown: mockExiting,
    ZoomOutUp: mockExiting,
    BounceOut: mockExiting,
    BounceOutDown: mockExiting,
    BounceOutUp: mockExiting,
    FlipOutXDown: mockExiting,
    FlipOutXUp: mockExiting,
    FlipOutYLeft: mockExiting,
    FlipOutYRight: mockExiting,
    StretchOutX: mockExiting,
    StretchOutY: mockExiting,
    LightSpeedOutLeft: mockExiting,
    LightSpeedOutRight: mockExiting,
    PinwheelOut: mockExiting,
    RotateOutDownLeft: mockExiting,
    RotateOutDownRight: mockExiting,
    RotateOutUpLeft: mockExiting,
    RotateOutUpRight: mockExiting,
    RollOutLeft: mockExiting,
    RollOutRight: mockExiting,
    // Layout animations - layout
    Layout: { duration: jest.fn().mockReturnThis(), springify: jest.fn().mockReturnThis() },
    LinearTransition: { duration: jest.fn().mockReturnThis() },
    SequencedTransition: { duration: jest.fn().mockReturnThis() },
    FadingTransition: { duration: jest.fn().mockReturnThis() },
    JumpingTransition: { duration: jest.fn().mockReturnThis() },
    CurvedTransition: { duration: jest.fn().mockReturnThis() },
    EntryExitTransition: { duration: jest.fn().mockReturnThis() },
    // Utilities
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    createAnimatedComponent: (component) => component,
    // Animated components
    ...Animated,
  };
});
