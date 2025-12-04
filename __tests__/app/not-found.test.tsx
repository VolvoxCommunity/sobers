/**
 * @fileoverview Tests for app/+not-found.tsx
 *
 * Tests the 404 not found screen.
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
    Screen: ({ options }: { options: { title: string } }) => {
      const React = require('react');
      return React.createElement('View', { testID: 'stack-screen', title: options.title });
    },
  },
  Link: ({
    children,
    href,
    style,
  }: {
    children: React.ReactNode;
    href: string;
    style?: unknown;
  }) => {
    const React = require('react');
    return React.createElement('View', { testID: 'link', href, style }, children);
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('NotFoundScreen', () => {
  it('renders the not found message', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText("This screen doesn't exist.")).toBeTruthy();
  });

  it('renders the home link', () => {
    render(<NotFoundScreen />);

    expect(screen.getByText('Go to home screen!')).toBeTruthy();
  });

  it('renders the Stack.Screen with correct title', () => {
    render(<NotFoundScreen />);

    const stackScreen = screen.getByTestId('stack-screen');
    expect(stackScreen.props.title).toBe('Oops!');
  });

  it('link points to home', () => {
    render(<NotFoundScreen />);

    const link = screen.getByTestId('link');
    expect(link.props.href).toBe('/');
  });
});
