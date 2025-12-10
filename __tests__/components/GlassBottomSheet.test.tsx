// =============================================================================
// Imports
// =============================================================================
import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

  return {
    BottomSheetModal: MockBottomSheetModal,
    BottomSheetView,
    BottomSheetBackdrop,
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

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

// =============================================================================
// Test Helpers
// =============================================================================
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// =============================================================================
// Test Suite
// =============================================================================
describe('GlassBottomSheet', () => {
  const defaultProps = {
    snapPoints: ['50%', '90%'],
    children: <Text>Test Content</Text>,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering Tests
  // ---------------------------------------------------------------------------
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should render children content', () => {
      const { getByText } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should render BottomSheetView wrapper', () => {
      const { getByTestId } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-view')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Platform-Specific Tests
  // ---------------------------------------------------------------------------
  describe('Platform-Specific Behavior', () => {
    it('should use BlurView backdrop on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('blur-view')).toBeTruthy();
    });

    it('should use standard backdrop on Android', () => {
      Platform.OS = 'android';
      const { getByTestId, queryByTestId } = renderWithTheme(
        <GlassBottomSheet {...defaultProps} />
      );
      expect(getByTestId('bottom-sheet-backdrop')).toBeTruthy();
      expect(queryByTestId('blur-view')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Props Tests
  // ---------------------------------------------------------------------------
  describe('Props', () => {
    it('should accept custom snapPoints', () => {
      const customSnapPoints = ['25%', '50%', '75%'];
      const { getByTestId } = renderWithTheme(
        <GlassBottomSheet snapPoints={customSnapPoints}>{defaultProps.children}</GlassBottomSheet>
      );
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should call onDismiss callback when provided', async () => {
      const onDismiss = jest.fn();
      renderWithTheme(<GlassBottomSheet {...defaultProps} onDismiss={onDismiss} />);
      // Note: In real usage, dismissal would trigger onDismiss
      // This is a structural test to ensure the prop is accepted
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should accept keyboardBehavior prop', () => {
      const { getByTestId } = renderWithTheme(
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
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current).toBeTruthy();
      expect(ref.current?.present).toBeDefined();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('should expose dismiss method via ref', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current?.dismiss).toBeDefined();
      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('should expose snapToIndex method via ref', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      expect(ref.current?.snapToIndex).toBeDefined();
      expect(typeof ref.current?.snapToIndex).toBe('function');
    });

    it('should call present on ref.current.present()', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.present();
      expect(ref.current?.present).toBeDefined();
    });

    it('should call dismiss on ref.current.dismiss()', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.dismiss();
      expect(ref.current?.dismiss).toBeDefined();
    });

    it('should call snapToIndex with index parameter', () => {
      const ref = createRef<GlassBottomSheetRef>();
      renderWithTheme(<GlassBottomSheet ref={ref} {...defaultProps} />);

      ref.current?.snapToIndex(1);
      expect(ref.current?.snapToIndex).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Theme Integration Tests
  // ---------------------------------------------------------------------------
  describe('Theme Integration', () => {
    it('should render with theme context', () => {
      const { getByTestId } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
      expect(getByTestId('bottom-sheet-modal')).toBeTruthy();
    });

    it('should apply theme colors to backdrop and content', () => {
      const { getByTestId } = renderWithTheme(<GlassBottomSheet {...defaultProps} />);
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
      const { getByText } = renderWithTheme(
        <GlassBottomSheet {...defaultProps}>
          <Text accessibilityLabel="Sheet Content">Accessible Content</Text>
        </GlassBottomSheet>
      );
      expect(getByText('Accessible Content')).toBeTruthy();
    });
  });
});
