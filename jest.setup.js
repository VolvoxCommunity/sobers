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
    spring: (value, config) => ({
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
jest.mock('expo-router', () => ({
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
  Link: ({ children, ...props }) => children,
  Slot: ({ children }) => children,
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
}));

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
  makeRedirectUri: jest.fn(() => 'sobrietywaypoint://auth/callback'),
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
    default: ({ value, onChange, mode, display, ...props }) =>
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
    version: '1.0.0',
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

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: ({ children, ...props }) => React.createElement('BlurView', props, children),
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
