/**
 * @fileoverview Tests for WhatsNewVersionSection component
 *
 * Tests the collapsible version section component including:
 * - Header rendering with version, title, and date
 * - NEW badge visibility based on isNew prop
 * - Expand/collapse behavior
 * - Feature sorting (features first, then fixes)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WhatsNewVersionSection from '@/components/whats-new/WhatsNewVersionSection';
import type { WhatsNewRelease } from '@/lib/whats-new';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#007AFF',
  success: '#34C759',
  card: '#ffffff',
  border: '#e0e0e0',
  background: '#f5f5f5',
  fontRegular: 'System',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

// Mock WhatsNewFeatureCard
jest.mock('@/components/whats-new/WhatsNewFeatureCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactModule = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ feature }: { feature: { title: string } }) =>
      ReactModule.createElement(
        View,
        { testID: `feature-${feature.title}` },
        ReactModule.createElement(Text, null, feature.title)
      ),
  };
});

// =============================================================================
// Tests
// =============================================================================

describe('WhatsNewVersionSection', () => {
  const mockRelease: WhatsNewRelease = {
    id: 'release-1',
    version: '1.2.0',
    title: 'Holiday Update',
    createdAt: '2024-12-15T12:00:00Z', // Mid-month to avoid timezone edge cases
    features: [
      {
        id: '1',
        title: 'Feature 1',
        description: 'Desc',
        imageUrl: null,
        displayOrder: 0,
        type: 'feature',
      },
      {
        id: '2',
        title: 'Bug Fix',
        description: 'Desc',
        imageUrl: null,
        displayOrder: 1,
        type: 'fix',
      },
    ],
  };

  describe('header rendering', () => {
    it('displays version, title, and formatted date', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      // Version badge shows version without "v" prefix
      expect(screen.getByText('1.2.0')).toBeTruthy();
      expect(screen.getByText('Holiday Update')).toBeTruthy();
      expect(screen.getByText(/Dec 2024/)).toBeTruthy();
    });

    it('shows NEW badge when isNew is true', () => {
      render(<WhatsNewVersionSection release={mockRelease} isNew={true} defaultExpanded={false} />);

      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('does not show NEW badge when isNew is false', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      expect(screen.queryByText('NEW')).toBeNull();
    });
  });

  describe('expand/collapse behavior', () => {
    it('starts collapsed when defaultExpanded is false', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      expect(screen.queryByText('Feature 1')).toBeNull();
    });

    it('starts expanded when defaultExpanded is true', () => {
      render(<WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={true} />);

      expect(screen.getByText('Feature 1')).toBeTruthy();
    });

    it('toggles content visibility when header is pressed', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      // Initially collapsed
      expect(screen.queryByText('Feature 1')).toBeNull();

      // Press header to expand
      fireEvent.press(screen.getByTestId('version-section-header'));
      expect(screen.getByText('Feature 1')).toBeTruthy();

      // Press again to collapse
      fireEvent.press(screen.getByTestId('version-section-header'));
      expect(screen.queryByText('Feature 1')).toBeNull();
    });
  });

  describe('feature sorting', () => {
    it('renders features sorted by type (features first, then fixes)', () => {
      const releaseWithMixedTypes: WhatsNewRelease = {
        ...mockRelease,
        features: [
          {
            id: '1',
            title: 'Fix A',
            description: 'D',
            imageUrl: null,
            displayOrder: 0,
            type: 'fix',
          },
          {
            id: '2',
            title: 'Feature B',
            description: 'D',
            imageUrl: null,
            displayOrder: 1,
            type: 'feature',
          },
          {
            id: '3',
            title: 'Fix C',
            description: 'D',
            imageUrl: null,
            displayOrder: 2,
            type: 'fix',
          },
        ],
      };

      render(
        <WhatsNewVersionSection
          release={releaseWithMixedTypes}
          isNew={false}
          defaultExpanded={true}
        />
      );

      const features = screen.getAllByTestId(/^feature-/);
      expect(features[0].props.testID).toBe('feature-Feature B');
      expect(features[1].props.testID).toBe('feature-Fix A');
      expect(features[2].props.testID).toBe('feature-Fix C');
    });

    it('sorts features by displayOrder within same type', () => {
      const releaseWithOrder: WhatsNewRelease = {
        ...mockRelease,
        features: [
          {
            id: '1',
            title: 'Feature C',
            description: 'D',
            imageUrl: null,
            displayOrder: 2,
            type: 'feature',
          },
          {
            id: '2',
            title: 'Feature A',
            description: 'D',
            imageUrl: null,
            displayOrder: 0,
            type: 'feature',
          },
          {
            id: '3',
            title: 'Feature B',
            description: 'D',
            imageUrl: null,
            displayOrder: 1,
            type: 'feature',
          },
        ],
      };

      render(
        <WhatsNewVersionSection release={releaseWithOrder} isNew={false} defaultExpanded={true} />
      );

      const features = screen.getAllByTestId(/^feature-/);
      expect(features[0].props.testID).toBe('feature-Feature A');
      expect(features[1].props.testID).toBe('feature-Feature B');
      expect(features[2].props.testID).toBe('feature-Feature C');
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility role on header', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      const header = screen.getByTestId('version-section-header');
      expect(header.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibilityLabel when collapsed', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      const header = screen.getByTestId('version-section-header');
      expect(header.props.accessibilityLabel).toContain('Holiday Update');
      expect(header.props.accessibilityLabel).toContain('1.2.0');
      expect(header.props.accessibilityLabel).toContain('Expand');
    });

    it('has correct accessibilityLabel when expanded', () => {
      render(<WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={true} />);

      const header = screen.getByTestId('version-section-header');
      expect(header.props.accessibilityLabel).toContain('Collapse');
    });

    it('updates accessibilityState on toggle', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      const header = screen.getByTestId('version-section-header');
      expect(header.props.accessibilityState).toEqual({ expanded: false });

      fireEvent.press(header);
      expect(header.props.accessibilityState).toEqual({ expanded: true });
    });
  });

  describe('edge cases', () => {
    it('renders correctly with empty features array', () => {
      const releaseWithNoFeatures: WhatsNewRelease = {
        ...mockRelease,
        features: [],
      };

      render(
        <WhatsNewVersionSection
          release={releaseWithNoFeatures}
          isNew={false}
          defaultExpanded={true}
        />
      );

      // Header should still render (version badge without "v" prefix)
      expect(screen.getByText('1.2.0')).toBeTruthy();
      // No features to display
      expect(screen.queryByTestId(/^feature-/)).toBeNull();
    });

    it('renders correctly with single feature', () => {
      const releaseWithOneFeature: WhatsNewRelease = {
        ...mockRelease,
        features: [
          {
            id: '1',
            title: 'Only Feature',
            description: 'D',
            imageUrl: null,
            displayOrder: 0,
            type: 'feature',
          },
        ],
      };

      render(
        <WhatsNewVersionSection
          release={releaseWithOneFeature}
          isNew={false}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText('Only Feature')).toBeTruthy();
    });

    it('formats various date formats correctly', () => {
      const releaseJan: WhatsNewRelease = {
        ...mockRelease,
        createdAt: '2025-01-15T12:00:00Z',
      };

      render(<WhatsNewVersionSection release={releaseJan} isNew={false} defaultExpanded={false} />);

      expect(screen.getByText(/Jan 2025/)).toBeTruthy();
    });
  });
});
