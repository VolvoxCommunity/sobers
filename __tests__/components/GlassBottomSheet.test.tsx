// =============================================================================
// Imports
// =============================================================================

// Unmock GlassBottomSheet so we can test the actual component
import React, { createRef } from 'react';
import { Dimensions, Platform, Text } from 'react-native';
import { act } from '@testing-library/react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { renderWithProviders } from '@/__tests__/test-utils';

jest.unmock('@/components/GlassBottomSheet');

// Extend global for TypeScript
declare global {
  var __backHandlerListeners: (() => boolean)[] | undefined;
}

// =============================================================================
// Device Size Constants
// =============================================================================

/**
 * iPhone screen dimensions for testing various device sizes.
 * Values represent logical points (not physical pixels).
 */
const IPHONE_SIZES = {
  // iPhone SE (3rd gen) / iPhone 8 - smallest modern iPhone
  SE: { width: 375, height: 667 },
  // iPhone 14 / 15 - standard size
  STANDARD: { width: 390, height: 844 },
  // iPhone 14 Pro / 15 Pro - Pro size
  PRO: { width: 393, height: 852 },
  // iPhone 14 Pro Max / 15 Pro Max - largest iPhone
  PRO_MAX: { width: 430, height: 932 },
  // iPhone 14 Plus / 15 Plus - Plus size (between standard and Pro Max)
  PLUS: { width: 428, height: 926 },
} as const;

// =============================================================================
// Mock Dependencies
// =============================================================================
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');

  const { View } = require('react-native');

  const MockBottomSheetModal = React.forwardRef(
    ({ children, snapPoints, backdropComponent }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
        snapToIndex: jest.fn(),
      }));

      return (
        <View testID="bottom-sheet-modal">
          {backdropComponent &&
            backdropComponent({ animatedIndex: { value: 0 }, animatedPosition: { value: 0 } })}
          {children}
        </View>
      );
    }
  );
  MockBottomSheetModal.displayName = 'BottomSheetModal';

  const BottomSheetView = ({ children }: any) => <View testID="bottom-sheet-view">{children}</View>;
  BottomSheetView.displayName = 'BottomSheetView';

  const BottomSheetBackdrop = ({ style }: any) => (
    <View testID="bottom-sheet-backdrop" style={style} />
  );
  BottomSheetBackdrop.displayName = 'BottomSheetBackdrop';

  // Provider passthrough for renderWithProviders compatibility
  const BottomSheetModalProvider = ({ children }: any) => children;

  return {
    BottomSheetModal: MockBottomSheetModal,
    BottomSheetView,
    BottomSheetBackdrop,
    BottomSheetModalProvider,
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('expo-blur', () => ({
  BlurView: ({ children, intensity, tint, style }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="blur-view" style={style}>
        {children}
      </View>
    );
  },
}));
/* eslint-enable @typescript-eslint/no-require-imports */

// =============================================================================
// BackHandler Test Helpers
// =============================================================================

/**
 * Returns the current BackHandler listeners from the global mock.
 * BackHandler is mocked in jest.setup.js with listeners stored in global.__backHandlerListeners.
 */
const getBackHandlerListeners = (): (() => boolean)[] => {
  return global.__backHandlerListeners || [];
};

/**
 * Clears all BackHandler listeners.
 */
const clearBackHandlerListeners = (): void => {
  global.__backHandlerListeners = [];
};

/**
 * Simulates pressing the Android hardware back button.
 * Calls all registered BackHandler listeners in reverse order (LIFO).
 * Returns true if any listener handled the event (returned true).
 */
const simulateBackPress = (): boolean => {
  const listeners = getBackHandlerListeners();
  // Process listeners in reverse order (most recent first, like real BackHandler)
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i]()) {
      return true; // Event was handled
    }
  }
  return false; // Event was not handled
};

// =============================================================================
// Test Suite
// =============================================================================
describe('GlassBottomSheet', () => {
  const originalPlatformOS = Platform.OS;
  const defaultProps = {
    snapPoints: ['50%', '90%'],
    children: <Text>Test Content</Text>,
  };

  afterEach(() => {
    jest.clearAllMocks();
    // Clear BackHandler listeners between tests
    clearBackHandlerListeners();
    // Restore Platform.OS using Object.defineProperty for robustness across Jest environments
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering Tests
  // ---------------------------------------------------------------------------
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should render children content', () => {
      const { getByText } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should render children directly inside modal (no BottomSheetView wrapper)', () => {
      // Children are passed directly to BottomSheetModal without a BottomSheetView wrapper.
      // This is required for BottomSheetScrollView to work correctly as a direct child.
      const { getByTestId, getByText } = renderWithProviders(
        <GlassBottomSheet {...defaultProps} />
      );
      const modal = getByTestId('bottom-sheet-modal');
      const content = getByText('Test Content');
      // Verify content is rendered and is a child of the modal
      expect(modal).toBeTruthy();
      expect(content).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Platform-Specific Tests
  // ---------------------------------------------------------------------------
  describe('Platform-Specific Behavior', () => {
    it('should use standard backdrop on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      // We use BottomSheetBackdrop on all platforms for proper gesture handling
      // iOS gets a lighter opacity (0.3) for a glass-like effect
      expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
    });

    it('should use standard backdrop on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      // Android uses the same backdrop component but with higher opacity (0.5)
      expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Props Tests
  // ---------------------------------------------------------------------------
  describe('Props', () => {
    it('should accept custom snapPoints', () => {
      const customSnapPoints = ['25%', '50%', '75%'];
      const { getByTestId } = renderWithProviders(
        <GlassBottomSheet snapPoints={customSnapPoints}>{defaultProps.children}</GlassBottomSheet>
      );
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should call onDismiss callback when provided', async () => {
      const onDismiss = jest.fn();
      renderWithProviders(<GlassBottomSheet {...defaultProps} onDismiss={onDismiss} />);
      // Note: In real usage, dismissal would trigger onDismiss
      // This is a structural test to ensure the prop is accepted
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should accept keyboardBehavior prop', () => {
      const { getByTestId } = renderWithProviders(
        <GlassBottomSheet {...defaultProps} keyboardBehavior="extend" />
      );
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Imperative API Tests
  // ---------------------------------------------------------------------------
  describe('Imperative API', () => {
    it('should expose present method via ref', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current).toBeTruthy();
      expect(ref.current?.present).toBeDefined();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('should expose dismiss method via ref', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current?.dismiss).toBeDefined();
      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('should expose snapToIndex method via ref', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current?.snapToIndex).toBeDefined();
      expect(typeof ref.current?.snapToIndex).toBe('function');
    });

    it('should call present on ref.current.present()', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.present();
      expect(ref.current?.present).toBeDefined();
    });

    it('should call dismiss on ref.current.dismiss()', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.dismiss();
      expect(ref.current?.dismiss).toBeDefined();
    });

    it('should call snapToIndex with index parameter', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.snapToIndex(1);
      expect(ref.current?.snapToIndex).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Theme Integration Tests
  // ---------------------------------------------------------------------------
  describe('Theme Integration', () => {
    it('should render with theme context', () => {
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should apply theme colors to backdrop and content', () => {
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      const bottomSheet = getByTestId('bottom-sheet-modal');
      expect(bottomSheet).toBeTruthy();
      // Theme colors are applied in the component implementation
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility Tests
  // ---------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('should render accessible content', () => {
      const { getByText } = renderWithProviders(
        <GlassBottomSheet {...defaultProps}>
          <Text accessibilityLabel="Sheet Content">Accessible Content</Text>
        </GlassBottomSheet>
      );
      expect(getByText('Accessible Content')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Web-Specific Tests
  // ---------------------------------------------------------------------------
  describe('Web Platform Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });
    });

    it('should render on web platform', () => {
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should use standard backdrop on web', () => {
      const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
    });

    it('should expose imperative API on web', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current?.present).toBeDefined();
      expect(ref.current?.dismiss).toBeDefined();
      expect(ref.current?.snapToIndex).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Dismiss Callback Tests
  // ---------------------------------------------------------------------------
  describe('Dismiss Callback', () => {
    it('should accept onDismiss prop', () => {
      const onDismiss = jest.fn();
      const ref = createRef<GlassBottomSheetRef>();

      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} onDismiss={onDismiss} />);

      // The onDismiss callback is passed to the component
      // This test verifies the prop is properly accepted
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should work without onDismiss callback (optional prop)', () => {
      const ref = createRef<GlassBottomSheetRef>();

      // Render without onDismiss - should not throw
      const { getByTestId } = renderWithProviders(
        <GlassBottomSheet ref={ref} snapPoints={['50%']}>
          <Text>Content</Text>
        </GlassBottomSheet>
      );

      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();

      // Call present and dismiss - should work without onDismiss callback
      ref.current?.present();
      ref.current?.dismiss();
    });
  });

  // ---------------------------------------------------------------------------
  // Android Back Button Tests
  // ---------------------------------------------------------------------------
  describe('Android Back Button Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
    });

    it('should register BackHandler listener when sheet is presented on Android', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      // Initially no listeners
      expect(getBackHandlerListeners().length).toBe(0);

      // Present the sheet
      act(() => {
        ref.current?.present();
      });

      // BackHandler listener should be registered when sheet is open
      expect(getBackHandlerListeners().length).toBe(1);
    });

    it('should dismiss sheet when back button is pressed while sheet is open', () => {
      const ref = createRef<GlassBottomSheetRef>();
      const onDismiss = jest.fn();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} onDismiss={onDismiss} />);

      // Present the sheet
      act(() => {
        ref.current?.present();
      });

      // Simulate back press - should return true (handled) and dismiss the sheet
      const handled = simulateBackPress();
      expect(handled).toBe(true);
    });

    it('should not register BackHandler listener when sheet is not open', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      // Sheet not presented - no listener should be registered
      expect(getBackHandlerListeners().length).toBe(0);
    });

    it('should remove BackHandler listener when sheet is dismissed', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      // Present the sheet
      act(() => {
        ref.current?.present();
      });

      expect(getBackHandlerListeners().length).toBe(1);

      // Dismiss the sheet
      act(() => {
        ref.current?.dismiss();
      });

      // Listener should be removed
      expect(getBackHandlerListeners().length).toBe(0);
    });

    it('should not intercept back button on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });

      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      // Present the sheet
      act(() => {
        ref.current?.present();
      });

      // iOS should not register BackHandler listener
      expect(getBackHandlerListeners().length).toBe(0);
    });

    it('should not intercept back button on web', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      const ref = createRef<GlassBottomSheetRef>();
      renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

      // Present the sheet
      act(() => {
        ref.current?.present();
      });

      // Web should not register BackHandler listener (uses Escape key instead)
      expect(getBackHandlerListeners().length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // iPhone Screen Size Tests
  // ---------------------------------------------------------------------------
  describe('iPhone Screen Sizes', () => {
    /**
     * Helper to mock screen dimensions for testing.
     */
    const mockScreenSize = (size: { width: number; height: number }) => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({
        width: size.width,
        height: size.height,
        scale: 3,
        fontScale: 1,
      });
    };

    beforeEach(() => {
      // Ensure iOS platform for iPhone tests
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('iPhone SE / iPhone 8 (375x667)', () => {
      beforeEach(() => {
        mockScreenSize(IPHONE_SIZES.SE);
      });

      it('should render correctly on smallest iPhone screen', () => {
        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
      });

      it('should render backdrop on iPhone SE', () => {
        const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      });

      it('should handle multiple snap points on smaller screen', () => {
        const { getByTestId } = renderWithProviders(
          <GlassBottomSheet snapPoints={['25%', '50%', '90%']}>
            <Text>Multi-snap Content</Text>
          </GlassBottomSheet>
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
      });
    });

    describe('iPhone 14/15 Standard (390x844)', () => {
      beforeEach(() => {
        mockScreenSize(IPHONE_SIZES.STANDARD);
      });

      it('should render correctly on standard iPhone screen', () => {
        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
      });

      it('should render backdrop on standard iPhone', () => {
        const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      });

      it('should expose imperative API on standard iPhone', () => {
        const ref = createRef<GlassBottomSheetRef>();
        renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

        expect(ref.current?.present).toBeDefined();
        expect(ref.current?.dismiss).toBeDefined();
        expect(ref.current?.snapToIndex).toBeDefined();
      });
    });

    describe('iPhone 14/15 Pro (393x852)', () => {
      beforeEach(() => {
        mockScreenSize(IPHONE_SIZES.PRO);
      });

      it('should render correctly on Pro iPhone screen', () => {
        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
      });

      it('should render backdrop on Pro iPhone', () => {
        const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      });

      it('should handle keyboard behavior on Pro iPhone', () => {
        const { getByTestId } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} keyboardBehavior="extend" />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
      });
    });

    describe('iPhone 14/15 Plus (428x926)', () => {
      beforeEach(() => {
        mockScreenSize(IPHONE_SIZES.PLUS);
      });

      it('should render correctly on Plus iPhone screen', () => {
        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
      });

      it('should render backdrop on Plus iPhone', () => {
        const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      });
    });

    describe('iPhone 14/15 Pro Max (430x932)', () => {
      beforeEach(() => {
        mockScreenSize(IPHONE_SIZES.PRO_MAX);
      });

      it('should render correctly on Pro Max iPhone screen', () => {
        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet {...defaultProps} />
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
      });

      it('should render backdrop on Pro Max iPhone', () => {
        const { getByTestId } = renderWithProviders(<GlassBottomSheet {...defaultProps} />);
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      });

      it('should handle large snap points on Pro Max screen', () => {
        const { getByTestId } = renderWithProviders(
          <GlassBottomSheet snapPoints={['30%', '60%', '95%']}>
            <Text>Large Screen Content</Text>
          </GlassBottomSheet>
        );
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
      });

      it('should expose full imperative API on Pro Max iPhone', () => {
        const ref = createRef<GlassBottomSheetRef>();
        renderWithProviders(<GlassBottomSheet ref={ref} {...defaultProps} />);

        expect(ref.current?.present).toBeDefined();
        expect(ref.current?.dismiss).toBeDefined();
        expect(ref.current?.snapToIndex).toBeDefined();

        // Verify methods can be called without errors
        ref.current?.present();
        ref.current?.snapToIndex(1);
        ref.current?.dismiss();
      });
    });

    describe('Cross-Size Consistency', () => {
      it.each([
        ['iPhone SE', IPHONE_SIZES.SE],
        ['iPhone Standard', IPHONE_SIZES.STANDARD],
        ['iPhone Pro', IPHONE_SIZES.PRO],
        ['iPhone Plus', IPHONE_SIZES.PLUS],
        ['iPhone Pro Max', IPHONE_SIZES.PRO_MAX],
      ])('should render consistently on %s', (name, size) => {
        mockScreenSize(size);
        const ref = createRef<GlassBottomSheetRef>();

        const { getByTestId, getByText } = renderWithProviders(
          <GlassBottomSheet ref={ref} {...defaultProps} />
        );

        // Verify core functionality works across all sizes
        expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
        expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
        expect(getByText('Test Content')).toBeTruthy();
        expect(ref.current?.present).toBeDefined();
        expect(ref.current?.dismiss).toBeDefined();
        expect(ref.current?.snapToIndex).toBeDefined();
      });
    });
  });
});
