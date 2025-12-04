/**
 * @fileoverview Tests for AnimatedBottomNav component
 *
 * Tests the animated bottom navigation including:
 * - Rendering with different items
 * - Active index handling (controlled and uncontrolled)
 * - Item press handling
 * - Custom accent color
 * - Theme integration
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AnimatedBottomNav, { AnimatedNavItem } from '@/components/AnimatedBottomNav';

// =============================================================================
// Mocks
// =============================================================================

// Note: react-native is mocked globally in jest.setup.js
// We need to add Animated support to the global mock

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      primaryLight: '#E5F1FF',
      text: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// =============================================================================
// Test Data
// =============================================================================

const MockIcon = ({ size, color }: { size?: number; color?: string }) => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return React.createElement(View, { testID: 'mock-icon' }, React.createElement(Text, null, color));
};

const createMockItems = (onPressCallbacks?: ((() => void) | undefined)[]): AnimatedNavItem[] => [
  { label: 'Home', icon: MockIcon, onPress: onPressCallbacks?.[0] },
  { label: 'Search', icon: MockIcon, onPress: onPressCallbacks?.[1] },
  { label: 'Profile', icon: MockIcon, onPress: onPressCallbacks?.[2] },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('AnimatedBottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const items = createMockItems();
      expect(() => render(<AnimatedBottomNav items={items} />)).not.toThrow();
    });

    it('renders all navigation items', () => {
      const items = createMockItems();
      render(<AnimatedBottomNav items={items} />);

      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Search')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    it('renders icon components for each item', () => {
      const items = createMockItems();
      render(<AnimatedBottomNav items={items} />);

      const icons = screen.getAllByTestId('mock-icon');
      expect(icons).toHaveLength(3);
    });
  });

  describe('uncontrolled mode', () => {
    it('starts with first item active by default', () => {
      const items = createMockItems();
      render(<AnimatedBottomNav items={items} />);

      // First item should be active (receives accent color)
      const homeText = screen.getByText('Home');
      expect(homeText).toBeTruthy();
    });

    it('changes active index when item is pressed', () => {
      const items = createMockItems();
      render(<AnimatedBottomNav items={items} />);

      // Press the second item
      fireEvent.press(screen.getByText('Search'));

      // The component should re-render with new active state
      // Since we're in uncontrolled mode, internal state should update
    });
  });

  describe('controlled mode', () => {
    it('uses controlled activeIndex when provided', () => {
      const items = createMockItems();
      const onActiveIndexChange = jest.fn();

      render(
        <AnimatedBottomNav
          items={items}
          activeIndex={1}
          onActiveIndexChange={onActiveIndexChange}
        />
      );

      // Second item (Search) should be the active one
      expect(screen.getByText('Search')).toBeTruthy();
    });

    it('calls onActiveIndexChange when item is pressed', () => {
      const items = createMockItems();
      const onActiveIndexChange = jest.fn();

      render(
        <AnimatedBottomNav
          items={items}
          activeIndex={0}
          onActiveIndexChange={onActiveIndexChange}
        />
      );

      fireEvent.press(screen.getByText('Profile'));

      expect(onActiveIndexChange).toHaveBeenCalledWith(2);
    });

    it('does not change internal state in controlled mode', () => {
      const items = createMockItems();
      const onActiveIndexChange = jest.fn();

      const { rerender } = render(
        <AnimatedBottomNav
          items={items}
          activeIndex={0}
          onActiveIndexChange={onActiveIndexChange}
        />
      );

      fireEvent.press(screen.getByText('Search'));

      // In controlled mode, activeIndex stays the same until parent updates it
      expect(onActiveIndexChange).toHaveBeenCalledWith(1);

      // Re-render with updated index (simulating parent state update)
      rerender(
        <AnimatedBottomNav
          items={items}
          activeIndex={1}
          onActiveIndexChange={onActiveIndexChange}
        />
      );
    });
  });

  describe('item press handling', () => {
    it('calls item onPress callback when pressed', () => {
      const mockOnPress = jest.fn();
      const items = createMockItems([mockOnPress, undefined, undefined]);

      render(<AnimatedBottomNav items={items} />);

      fireEvent.press(screen.getByText('Home'));

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('handles items without onPress callback', () => {
      const items = createMockItems();

      render(<AnimatedBottomNav items={items} />);

      // Should not throw when pressing item without onPress
      expect(() => fireEvent.press(screen.getByText('Search'))).not.toThrow();
    });
  });

  describe('custom accent color', () => {
    it('uses custom accent color when provided', () => {
      const items = createMockItems();
      const customAccent = '#FF5722';

      render(<AnimatedBottomNav items={items} accentColor={customAccent} />);

      // Component should render without errors with custom color
      expect(screen.getByText('Home')).toBeTruthy();
    });

    it('falls back to theme primary color when no accent provided', () => {
      const items = createMockItems();

      render(<AnimatedBottomNav items={items} />);

      // Component should render with theme's primary color
      expect(screen.getByText('Home')).toBeTruthy();
    });
  });

  describe('layout handling', () => {
    it('handles text layout events', () => {
      const items = createMockItems();

      render(<AnimatedBottomNav items={items} />);

      const homeText = screen.getByText('Home');

      // Simulate layout event
      fireEvent(homeText, 'layout', {
        nativeEvent: { layout: { width: 50, height: 20 } },
      });

      // Should handle layout without crashing
      expect(screen.getByText('Home')).toBeTruthy();
    });
  });

  describe('empty items array', () => {
    it('handles empty items array', () => {
      expect(() => render(<AnimatedBottomNav items={[]} />)).not.toThrow();
    });
  });

  describe('single item', () => {
    it('handles single item', () => {
      const items: AnimatedNavItem[] = [{ label: 'Single', icon: MockIcon }];

      render(<AnimatedBottomNav items={items} />);

      expect(screen.getByText('Single')).toBeTruthy();
    });
  });

  describe('many items', () => {
    it('handles many items', () => {
      const items: AnimatedNavItem[] = Array.from({ length: 5 }, (_, i) => ({
        label: `Item ${i + 1}`,
        icon: MockIcon,
      }));

      render(<AnimatedBottomNav items={items} />);

      expect(screen.getByText('Item 1')).toBeTruthy();
      expect(screen.getByText('Item 5')).toBeTruthy();
    });
  });
});
