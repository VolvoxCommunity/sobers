/**
 * @fileoverview Tests for ErrorBoundary component
 *
 * Tests the error boundary behavior including:
 * - Rendering children normally
 * - Catching and displaying errors
 * - Sentry error reporting
 * - Reset functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as Sentry from '@sentry/react-native';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    STORAGE: 'storage',
  },
}));

// =============================================================================
// Test Components
// =============================================================================

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>Normal content</Text>;
};

const ControlledErrorComponent = ({ throwError }: { throwError: () => boolean }) => {
  if (throwError()) {
    throw new Error('Controlled test error');
  }
  return <Text>Working content</Text>;
};

// =============================================================================
// Helper
// =============================================================================

const renderWithTheme = (children: React.ReactNode) => {
  return render(<ThemeProvider>{children}</ThemeProvider>);
};

// =============================================================================
// Test Suite
// =============================================================================

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      renderWithTheme(
        <ErrorBoundary>
          <Text>Child content</Text>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      renderWithTheme(
        <ErrorBoundary>
          <Text>First child</Text>
          <Text>Second child</Text>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeTruthy();
      expect(screen.getByText('Second child')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('catches errors and displays fallback UI', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
      expect(screen.getByText(/We've been notified/)).toBeTruthy();
    });

    it('displays Try Again button in error state', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('reports error to Sentry', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: {
            react: {
              componentStack: expect.any(String),
            },
          },
        })
      );
    });
  });

  describe('reset functionality', () => {
    it('resets error state when Try Again is pressed', () => {
      let shouldThrow = true;

      const { rerender } = renderWithTheme(
        <ErrorBoundary>
          <ControlledErrorComponent throwError={() => shouldThrow} />
        </ErrorBoundary>
      );

      // Verify error state
      expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();

      // Fix the error condition
      shouldThrow = false;

      // Press Try Again
      fireEvent.press(screen.getByText('Try Again'));

      // Re-render after reset
      rerender(
        <ThemeProvider>
          <ErrorBoundary>
            <ControlledErrorComponent throwError={() => shouldThrow} />
          </ErrorBoundary>
        </ThemeProvider>
      );

      // Component should attempt to render children again
      // After reset, if children don't throw, they should render
      expect(screen.getByText('Working content')).toBeTruthy();
    });
  });

  describe('nested error boundaries', () => {
    it('inner boundary catches its own errors', () => {
      renderWithTheme(
        <ErrorBoundary>
          <Text>Outer content</Text>
          <ErrorBoundary>
            <ThrowingComponent shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Outer content should still be visible
      expect(screen.getByText('Outer content')).toBeTruthy();
      // Inner boundary shows error
      expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    });
  });

  describe('theming', () => {
    it('uses theme colors from ThemeContext', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Just verify it renders without crashing with theme context
      expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    });
  });
});
