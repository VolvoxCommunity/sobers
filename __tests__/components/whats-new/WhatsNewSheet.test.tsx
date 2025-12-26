/**
 * @fileoverview Tests for WhatsNewSheet component
 *
 * Tests the What's New bottom sheet component including:
 * - Rendering release title and version
 * - Rendering all feature cards
 * - Dismiss button behavior
 * - Imperative ref API
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import WhatsNewSheet, { type WhatsNewSheetRef } from '@/components/whats-new/WhatsNewSheet';
import type { WhatsNewRelease } from '@/lib/whats-new';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  text: '#000000',
  textSecondary: '#666666',
  primary: '#007AFF',
  white: '#ffffff',
  card: '#ffffff',
  border: '#e0e0e0',
  background: '#f5f5f5',
  fontRegular: 'System',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

// Mock WhatsNewFeatureCard to simplify testing
jest.mock('@/components/whats-new/WhatsNewFeatureCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ feature }: { feature: { title: string } }) =>
      React.createElement(
        View,
        { testID: `feature-card-${feature.title.replace(/\s+/g, '-').toLowerCase()}` },
        React.createElement(Text, null, feature.title)
      ),
  };
});

// =============================================================================
// Tests
// =============================================================================

describe('WhatsNewSheet', () => {
  const mockRelease: WhatsNewRelease = {
    id: 'release-1',
    version: '1.2.0',
    title: "What's New in Sobers",
    features: [
      {
        id: 'feature-1',
        title: 'Money Saved Dashboard',
        description: 'Track your savings',
        imageUrl: null,
        displayOrder: 0,
        type: 'feature',
      },
    ],
  };

  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders release title and version when presented', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      // Present the sheet (wrap in act to handle state update)
      act(() => {
        ref.current?.present();
      });

      expect(screen.getByText("What's New in Sobers")).toBeTruthy();
      expect(screen.getByText('Version 1.2.0')).toBeTruthy();
    });

    it('renders all features', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      const releaseWithMultipleFeatures: WhatsNewRelease = {
        ...mockRelease,
        features: [
          {
            id: '1',
            title: 'Feature 1',
            description: 'Desc 1',
            imageUrl: null,
            displayOrder: 0,
            type: 'feature',
          },
          {
            id: '2',
            title: 'Feature 2',
            description: 'Desc 2',
            imageUrl: null,
            displayOrder: 1,
            type: 'fix',
          },
          {
            id: '3',
            title: 'Feature 3',
            description: 'Desc 3',
            imageUrl: null,
            displayOrder: 2,
            type: 'feature',
          },
        ],
      };

      render(
        <WhatsNewSheet ref={ref} release={releaseWithMultipleFeatures} onDismiss={mockOnDismiss} />
      );

      act(() => {
        ref.current?.present();
      });

      expect(screen.getByText('Feature 1')).toBeTruthy();
      expect(screen.getByText('Feature 2')).toBeTruthy();
      expect(screen.getByText('Feature 3')).toBeTruthy();
    });

    it('does not render content when not presented', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      // Don't present the sheet
      expect(screen.queryByText("What's New in Sobers")).toBeNull();
    });
  });

  describe('dismiss behavior', () => {
    it('calls onDismiss when Got it button is pressed', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      act(() => {
        ref.current?.present();
      });

      const button = screen.getByText('Got it!');
      fireEvent.press(button);

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('has accessible button with correct role and label', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      act(() => {
        ref.current?.present();
      });

      const button = screen.getByTestId('whats-new-got-it-button');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe("Dismiss What's New");
    });
  });

  describe('imperative API', () => {
    it('exposes present method via ref', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      expect(ref.current).toBeTruthy();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('exposes dismiss method via ref', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('calling dismiss via ref triggers onDismiss callback', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

      act(() => {
        ref.current?.present();
      });

      act(() => {
        ref.current?.dismiss();
      });

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });
});
