/**
 * @fileoverview Tests for PrayerCard component
 *
 * Tests the prayer card display including:
 * - Prayer title and content rendering
 * - Category badge display
 * - Favorite toggle functionality
 * - Expandable content
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PrayerCard from '@/components/program/PrayerCard';
import type { Prayer } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

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
      danger: '#ef4444',
      white: '#ffffff',
      shadow: '#000000',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
    },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => ({
  Heart: ({ fill, color: _color }: { fill?: string; color?: string }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: 'heart-icon',
      accessibilityLabel: `Heart ${fill !== 'transparent' ? 'filled' : 'unfilled'}`,
    });
  },
  ChevronDown: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'chevron-down' });
  },
  ChevronUp: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'chevron-up' });
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockStepPrayer: Prayer = {
  id: 'prayer-1',
  title: 'Third Step Prayer',
  content:
    'God, I offer myself to Thee—to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will.',
  category: 'step',
  step_number: 3,
  sort_order: 3,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCommonPrayer: Prayer = {
  id: 'prayer-2',
  title: 'Serenity Prayer',
  content:
    'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference.',
  category: 'common',
  step_number: undefined,
  sort_order: 100,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// Test Suite
// =============================================================================

describe('PrayerCard', () => {
  const mockOnToggleFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders prayer title', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Third Step Prayer')).toBeTruthy();
    });

    it('renders prayer content', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText(/God, I offer myself to Thee/)).toBeTruthy();
    });

    it('renders step badge for step prayers', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Step 3')).toBeTruthy();
    });

    it('renders common badge for common prayers', () => {
      render(
        <PrayerCard
          prayer={mockCommonPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Common')).toBeTruthy();
    });

    it('renders heart icon', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId('heart-icon')).toBeTruthy();
    });

    it('renders expand button with Read more text', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Read more')).toBeTruthy();
    });
  });

  describe('favorite toggle', () => {
    it('calls onToggleFavorite when heart is pressed', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteButton = screen.getByTestId(`prayer-favorite-${mockStepPrayer.id}`);
      fireEvent.press(favoriteButton);

      expect(mockOnToggleFavorite).toHaveBeenCalledWith(mockStepPrayer.id);
    });

    it('shows filled heart when isFavorite is true', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={true}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const heartIcon = screen.getByTestId('heart-icon');
      expect(heartIcon.props.accessibilityLabel).toBe('Heart filled');
    });

    it('shows unfilled heart when isFavorite is false', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const heartIcon = screen.getByTestId('heart-icon');
      expect(heartIcon.props.accessibilityLabel).toBe('Heart unfilled');
    });
  });

  describe('expand/collapse', () => {
    it('shows Show less text when expanded', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const expandButton = screen.getByTestId(`prayer-expand-${mockStepPrayer.id}`);
      fireEvent.press(expandButton);

      expect(screen.getByText('Show less')).toBeTruthy();
    });

    it('shows Read more text when collapsed', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Read more')).toBeTruthy();
    });

    it('shows chevron down when collapsed', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId('chevron-down')).toBeTruthy();
    });

    it('shows chevron up when expanded', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const expandButton = screen.getByTestId(`prayer-expand-${mockStepPrayer.id}`);
      fireEvent.press(expandButton);

      expect(screen.getByTestId('chevron-up')).toBeTruthy();
    });

    it('toggles back to collapsed state', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const expandButton = screen.getByTestId(`prayer-expand-${mockStepPrayer.id}`);

      // Expand
      fireEvent.press(expandButton);
      expect(screen.getByText('Show less')).toBeTruthy();

      // Collapse
      fireEvent.press(expandButton);
      expect(screen.getByText('Read more')).toBeTruthy();
    });
  });

  describe('category labels', () => {
    it('displays correct label for AA category', () => {
      const aaPrayer: Prayer = {
        ...mockCommonPrayer,
        id: 'prayer-aa',
        category: 'aa',
      };

      render(
        <PrayerCard prayer={aaPrayer} isFavorite={false} onToggleFavorite={mockOnToggleFavorite} />
      );

      expect(screen.getByText('Aa')).toBeTruthy();
    });

    it('displays correct label for NA category', () => {
      const naPrayer: Prayer = {
        ...mockCommonPrayer,
        id: 'prayer-na',
        category: 'na',
      };

      render(
        <PrayerCard prayer={naPrayer} isFavorite={false} onToggleFavorite={mockOnToggleFavorite} />
      );

      expect(screen.getByText('Na')).toBeTruthy();
    });
  });

  describe('testID attributes', () => {
    it('has correct testID for card', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId(`prayer-card-${mockStepPrayer.id}`)).toBeTruthy();
    });

    it('has correct testID for favorite button', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId(`prayer-favorite-${mockStepPrayer.id}`)).toBeTruthy();
    });

    it('has correct testID for expand button', () => {
      render(
        <PrayerCard
          prayer={mockStepPrayer}
          isFavorite={false}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId(`prayer-expand-${mockStepPrayer.id}`)).toBeTruthy();
    });
  });
});
