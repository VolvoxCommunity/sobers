/**
 * @fileoverview Tests for SocialLogos component
 *
 * Tests the Google logo SVG component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { GoogleLogo } from '@/components/auth/SocialLogos';

// =============================================================================
// Mocks
// =============================================================================

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');

  // Create proper React components for SVG elements
  const Svg = ({ children, ...props }: any) =>
    React.createElement('View', { testID: 'svg-mock', ...props }, children);
  const Path = (props: any) => React.createElement('View', { testID: 'path-mock', ...props });

  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path,
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('SocialLogos', () => {
  describe('GoogleLogo', () => {
    it('renders without crashing', () => {
      expect(() => render(<GoogleLogo />)).not.toThrow();
    });

    it('renders with default size', () => {
      expect(() => render(<GoogleLogo />)).not.toThrow();
    });

    it('renders with custom size', () => {
      expect(() => render(<GoogleLogo size={32} />)).not.toThrow();
    });

    it('renders with small size', () => {
      expect(() => render(<GoogleLogo size={16} />)).not.toThrow();
    });

    it('renders with large size', () => {
      expect(() => render(<GoogleLogo size={64} />)).not.toThrow();
    });
  });
});
