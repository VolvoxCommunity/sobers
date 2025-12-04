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
  };
});

// Mock processColor
global.processColor = (color) => color;

// Define __DEV__ for tests
global.__DEV__ = false;

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
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

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

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
      },
      from: jest.fn(() => createQueryBuilder()),
    })),
  };
});
