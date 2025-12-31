/**
 * @fileoverview Tests for WhatsNewSheet component
 *
 * Tests the What's New bottom sheet component including:
 * - Rendering "What's New?" title
 * - Rendering all version sections
 * - Marking new versions with badges
 * - Expanding latest version by default
 * - Close button behavior
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

// Mock WhatsNewVersionSection to simplify testing
jest.mock('@/components/whats-new/WhatsNewVersionSection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      release,
      isNew,
      defaultExpanded,
    }: {
      release: { version: string };
      isNew: boolean;
      defaultExpanded: boolean;
    }) =>
      React.createElement(
        View,
        { testID: `version-section-${release.version}` },
        React.createElement(Text, null, `v${release.version}`),
        isNew && React.createElement(Text, { testID: `new-badge-${release.version}` }, 'NEW'),
        defaultExpanded &&
          React.createElement(Text, { testID: `expanded-${release.version}` }, 'EXPANDED')
      ),
  };
});

// =============================================================================
// Test Data
// =============================================================================

const mockReleases: WhatsNewRelease[] = [
  {
    id: 'release-3',
    version: '3.0.0',
    title: 'Latest Update',
    createdAt: '2025-01-01T00:00:00Z',
    features: [
      {
        id: 'f1',
        title: 'Feature 1',
        description: 'Desc',
        imageUrl: null,
        displayOrder: 0,
        type: 'feature',
      },
    ],
  },
  {
    id: 'release-2',
    version: '2.0.0',
    title: 'Major Update',
    createdAt: '2024-12-01T00:00:00Z',
    features: [
      {
        id: 'f2',
        title: 'Feature 2',
        description: 'Desc',
        imageUrl: null,
        displayOrder: 0,
        type: 'feature',
      },
    ],
  },
  {
    id: 'release-1',
    version: '1.0.0',
    title: 'Initial Release',
    createdAt: '2024-11-01T00:00:00Z',
    features: [
      {
        id: 'f3',
        title: 'Feature 3',
        description: 'Desc',
        imageUrl: null,
        displayOrder: 0,
        type: 'feature',
      },
    ],
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('WhatsNewSheet', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it("renders 'What's New?' title when presented", () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      expect(screen.getByText("What's New?")).toBeTruthy();
    });

    it('renders all version sections', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      expect(screen.getByTestId('version-section-3.0.0')).toBeTruthy();
      expect(screen.getByTestId('version-section-2.0.0')).toBeTruthy();
      expect(screen.getByTestId('version-section-1.0.0')).toBeTruthy();
    });

    it('does not render content when not presented', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      // Don't present the sheet
      expect(screen.queryByText("What's New?")).toBeNull();
    });
  });

  describe('new version detection', () => {
    it('marks versions after lastSeenVersion as new', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // v3.0.0 and v2.0.0 are newer than 1.0.0, should have NEW badge
      expect(screen.getByTestId('new-badge-3.0.0')).toBeTruthy();
      expect(screen.getByTestId('new-badge-2.0.0')).toBeTruthy();
      // v1.0.0 is not newer than 1.0.0, should NOT have NEW badge
      expect(screen.queryByTestId('new-badge-1.0.0')).toBeNull();
    });

    it('marks all versions as new when lastSeenVersion is null', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion={null}
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // All versions should have NEW badge when no version has been seen
      expect(screen.getByTestId('new-badge-3.0.0')).toBeTruthy();
      expect(screen.getByTestId('new-badge-2.0.0')).toBeTruthy();
      expect(screen.getByTestId('new-badge-1.0.0')).toBeTruthy();
    });
  });

  describe('default expansion', () => {
    it('expands first new version by default', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // v3.0.0 is the first new version (newest), should be expanded
      expect(screen.getByTestId('expanded-3.0.0')).toBeTruthy();
      // v2.0.0 is also new but not the first, should NOT be expanded
      expect(screen.queryByTestId('expanded-2.0.0')).toBeNull();
      // v1.0.0 is not new, should NOT be expanded
      expect(screen.queryByTestId('expanded-1.0.0')).toBeNull();
    });

    it('expands latest version even when user has seen it', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="3.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // Latest version should always be expanded, even if already seen
      expect(screen.getByTestId('expanded-3.0.0')).toBeTruthy();
      expect(screen.queryByTestId('expanded-2.0.0')).toBeNull();
      expect(screen.queryByTestId('expanded-1.0.0')).toBeNull();
    });
  });

  describe('close button behavior', () => {
    it('calls onDismiss when close button is pressed', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      const button = screen.getByTestId('whats-new-close-button');
      fireEvent.press(button);

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('has accessible close button with correct role and label', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      const button = screen.getByTestId('whats-new-close-button');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe("Close What's New");
    });
  });

  describe('imperative API', () => {
    it('exposes present method via ref', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      expect(ref.current).toBeTruthy();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('exposes dismiss method via ref', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('calling dismiss via ref triggers onDismiss callback', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="1.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      act(() => {
        ref.current?.dismiss();
      });

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders correctly with empty releases array', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet ref={ref} releases={[]} lastSeenVersion="1.0.0" onDismiss={mockOnDismiss} />
      );

      act(() => {
        ref.current?.present();
      });

      // Title should still render
      expect(screen.getByText("What's New?")).toBeTruthy();
      // No version sections
      expect(screen.queryByTestId(/^version-section-/)).toBeNull();
      // Close button should still be present
      expect(screen.getByTestId('whats-new-close-button')).toBeTruthy();
    });

    it('renders correctly with single release', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      const singleRelease: WhatsNewRelease[] = [
        {
          id: 'only-release',
          version: '1.0.0',
          title: 'First Release',
          createdAt: '2024-12-01T00:00:00Z',
          features: [
            {
              id: 'f1',
              title: 'Feature',
              description: 'Desc',
              imageUrl: null,
              displayOrder: 0,
              type: 'feature',
            },
          ],
        },
      ];

      render(
        <WhatsNewSheet
          ref={ref}
          releases={singleRelease}
          lastSeenVersion={null}
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      expect(screen.getByTestId('version-section-1.0.0')).toBeTruthy();
      expect(screen.getByTestId('new-badge-1.0.0')).toBeTruthy();
      expect(screen.getByTestId('expanded-1.0.0')).toBeTruthy();
    });

    it('handles lastSeenVersion higher than all releases', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="99.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // No versions should be marked as new
      expect(screen.queryByTestId('new-badge-3.0.0')).toBeNull();
      expect(screen.queryByTestId('new-badge-2.0.0')).toBeNull();
      expect(screen.queryByTestId('new-badge-1.0.0')).toBeNull();
      // Latest version should still be expanded (even though not new)
      expect(screen.getByTestId('expanded-3.0.0')).toBeTruthy();
      expect(screen.queryByTestId('expanded-2.0.0')).toBeNull();
      expect(screen.queryByTestId('expanded-1.0.0')).toBeNull();
    });

    it('handles release with empty features array', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      const releaseWithNoFeatures: WhatsNewRelease[] = [
        {
          id: 'empty-release',
          version: '1.0.0',
          title: 'Empty Release',
          createdAt: '2024-12-01T00:00:00Z',
          features: [],
        },
      ];

      render(
        <WhatsNewSheet
          ref={ref}
          releases={releaseWithNoFeatures}
          lastSeenVersion={null}
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // Should still render the version section
      expect(screen.getByTestId('version-section-1.0.0')).toBeTruthy();
    });

    it('marks version equal to lastSeenVersion as not new', () => {
      const ref = React.createRef<WhatsNewSheetRef>();
      render(
        <WhatsNewSheet
          ref={ref}
          releases={mockReleases}
          lastSeenVersion="2.0.0"
          onDismiss={mockOnDismiss}
        />
      );

      act(() => {
        ref.current?.present();
      });

      // v3.0.0 is newer than 2.0.0, should have NEW badge
      expect(screen.getByTestId('new-badge-3.0.0')).toBeTruthy();
      // v2.0.0 equals lastSeenVersion, should NOT have NEW badge
      expect(screen.queryByTestId('new-badge-2.0.0')).toBeNull();
      // v1.0.0 is older, should NOT have NEW badge
      expect(screen.queryByTestId('new-badge-1.0.0')).toBeNull();
    });
  });
});
