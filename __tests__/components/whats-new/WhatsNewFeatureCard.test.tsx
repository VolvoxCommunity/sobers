/**
 * @fileoverview Tests for WhatsNewFeatureCard component
 *
 * Tests the feature card component including:
 * - Rendering title and description
 * - Image handling with loading states
 * - Rendering without image when imageUrl is null
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WhatsNewFeatureCard from '@/components/whats-new/WhatsNewFeatureCard';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  border: '#e0e0e0',
  fontRegular: 'System',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

// Mock expo-image
jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactModule = require('react');
  return {
    Image: ({ source, style, contentFit, _onLoad, _onError, ...props }: Record<string, unknown>) =>
      ReactModule.createElement('Image', {
        ...props,
        source: typeof source === 'object' ? (source as { uri: string }).uri : source,
        style,
        contentFit,
      }),
  };
});

// =============================================================================
// Tests
// =============================================================================

describe('WhatsNewFeatureCard', () => {
  const mockFeature = {
    id: 'feature-1',
    title: 'Money Saved Dashboard',
    description: "Track how much you've saved since sobriety",
    imageUrl: 'https://example.com/image.png',
    displayOrder: 0,
    type: 'feature' as const,
  };

  describe('rendering', () => {
    it('renders feature title and description', () => {
      render(<WhatsNewFeatureCard feature={mockFeature} />);

      expect(screen.getByText('Money Saved Dashboard')).toBeTruthy();
      expect(screen.getByText("Track how much you've saved since sobriety")).toBeTruthy();
    });

    it('renders without image when imageUrl is null', () => {
      const featureWithoutImage = { ...mockFeature, imageUrl: null };
      render(<WhatsNewFeatureCard feature={featureWithoutImage} />);

      expect(screen.getByText('Money Saved Dashboard')).toBeTruthy();
      // Should not have image container when no imageUrl
      expect(screen.queryByTestId('feature-card-image-container')).toBeNull();
    });

    it('shows image container when imageUrl is provided', () => {
      render(<WhatsNewFeatureCard feature={mockFeature} />);

      expect(screen.getByTestId('feature-card-image-container')).toBeTruthy();
    });
  });

  describe('content', () => {
    it('displays the correct title text', () => {
      const customFeature = { ...mockFeature, title: 'Custom Feature Title' };
      render(<WhatsNewFeatureCard feature={customFeature} />);

      expect(screen.getByText('Custom Feature Title')).toBeTruthy();
    });

    it('displays the correct description text', () => {
      const customFeature = { ...mockFeature, description: 'Custom description text' };
      render(<WhatsNewFeatureCard feature={customFeature} />);

      expect(screen.getByText('Custom description text')).toBeTruthy();
    });

    it('handles long description text', () => {
      const longDescription =
        'This is a very long description that spans multiple lines and contains a lot of information about the feature being displayed in the card component.';
      const customFeature = { ...mockFeature, description: longDescription };
      render(<WhatsNewFeatureCard feature={customFeature} />);

      expect(screen.getByText(longDescription)).toBeTruthy();
    });
  });

  describe('type badge', () => {
    it('displays NEW badge for feature type', () => {
      render(<WhatsNewFeatureCard feature={mockFeature} />);

      expect(screen.getByTestId('feature-type-badge')).toBeTruthy();
      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('displays FIX badge for fix type', () => {
      const fixFeature = { ...mockFeature, type: 'fix' as const };
      render(<WhatsNewFeatureCard feature={fixFeature} />);

      expect(screen.getByTestId('feature-type-badge')).toBeTruthy();
      expect(screen.getByText('FIX')).toBeTruthy();
    });
  });
});
