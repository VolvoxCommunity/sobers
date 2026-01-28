/**
 * @fileoverview Test utilities for React Native Testing Library
 *
 * Provides shared test helpers for wrapping components with required providers.
 * All tests should use renderWithProviders instead of custom wrapper implementations.
 *
 * Note: This wrapper uses minimal mock providers to avoid conflicts with test-specific
 * mocks. Individual tests can override contexts via jest.mock() as needed.
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Wrapper component that provides minimal context for tests.
 *
 * Uses React.Fragment to avoid conflicts with test-specific mocks while still
 * providing a consistent wrapper interface. Individual tests can mock contexts
 * like AuthContext and ThemeContext as needed.
 *
 * @param children - React children to wrap
 * @returns Component tree (minimal wrapper)
 */
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

/**
 * Renders a React component with a consistent wrapper for tests.
 *
 * This is the standard way to render components in tests. It provides a minimal
 * wrapper to avoid conflicts with test-specific mocks. Individual tests should
 * mock contexts like AuthContext and ThemeContext via jest.mock() as needed.
 *
 * @param ui - The component to render
 * @param options - Optional render options
 * @returns Render result with screen queries and utilities
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from '@/__tests__/test-utils';
 *
 * it('renders correctly', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeTruthy();
 * });
 * ```
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};
