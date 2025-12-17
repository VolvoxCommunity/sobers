/**
 * @fileoverview Tests for app/+not-found.tsx
 *
 * Tests the 404 not found screen with professional humor and recovery theme.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NotFoundScreen from '@/app/+not-found';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options: { title: string; headerShown: boolean } }) => {
      const React = require('react');
      return React.createElement('View', {
        testID: 'stack-screen',
        title: options.title,
        headerShown: options.headerShown,
      });
    },
  },
  Link: ({
    children,
    href,
    asChild,
  }: {
    children: React.ReactNode;
    href: string;
    asChild?: boolean;
  }) => {
    const React = require('react');
    return React.createElement('View', { testID: 'link', href, asChild }, children);
  },
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      textOnPrimary: '#ffffff',
      primary: '#007AFF',
      primaryLight: '#e5f1ff',
      border: '#e5e7eb',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
    },
  }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) => {
    const React = require('react');
    return React.createElement('View', { testID: `icon-${name}`, size, color });
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('NotFoundScreen', () => {
  it('renders the main title with humor', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('Looks like you wandered off the path')).toBeTruthy();
  });

  it('renders the 404 error code', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('404')).toBeTruthy();
  });

  it('renders the supportive subtitle', () => {
    render(<NotFoundScreen />);

    // Check for the subtitle text
    expect(screen.getByText(/even the best navigators take a wrong turn/)).toBeTruthy();
  });

  it('renders the recovery-themed quote', () => {
    render(<NotFoundScreen />);

    // The quote uses HTML entities for curly quotes
    expect(screen.getByText(/Progress, not perfection/)).toBeTruthy();
  });

  it('renders the home button with icon', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('Back to Home')).toBeTruthy();
    expect(screen.getByTestId('icon-home-outline')).toBeTruthy();
  });

  it('renders the compass icon', () => {
    render(<NotFoundScreen />);

    expect(screen.getByTestId('icon-compass-outline')).toBeTruthy();
  });

  it('renders the footer hint', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('One step at a time')).toBeTruthy();
  });

  it('renders the Stack.Screen with correct options', () => {
    render(<NotFoundScreen />);

    const stackScreen = screen.getByTestId('stack-screen');
    expect(stackScreen.props.title).toBe('Lost?');
    expect(stackScreen.props.headerShown).toBe(false);
  });

  it('link points to home with asChild prop', () => {
    render(<NotFoundScreen />);

    const link = screen.getByTestId('link');
    expect(link.props.href).toBe('/');
    expect(link.props.asChild).toBe(true);
  });
});
