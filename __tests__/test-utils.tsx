/**
 * @fileoverview Test utilities for React Native Testing Library
 *
 * Provides shared test helpers for wrapping components with required providers.
 * All tests should use renderWithProviders instead of custom wrapper implementations.
 *
 * ## Architecture Decision: Minimal Wrapper Pattern
 *
 * This wrapper intentionally uses a minimal approach (React.Fragment) to avoid
 * conflicts with test-specific mocks. The rationale:
 *
 * 1. **Mock Isolation**: Tests mock AuthContext/ThemeContext via jest.mock() at
 *    module level. Wrapping with real providers would conflict with these mocks.
 *
 * 2. **Flexibility**: Each test can define exactly the context values it needs
 *    for its specific test cases (e.g., loading states, auth states).
 *
 * 3. **No Side Effects**: Real providers may trigger side effects (API calls,
 *    subscriptions) that are undesirable in unit tests.
 *
 * ## Required Test Pattern
 *
 * Every test file using renderWithProviders MUST mock the contexts it depends on:
 *
 * ```tsx
 * // At top of test file, after imports:
 * jest.mock('@/contexts/AuthContext', () => ({
 *   useAuth: () => ({
 *     user: null,
 *     session: null,
 *     profile: mockProfile,
 *     loading: false,
 *     signOut: jest.fn(),
 *     // ...other auth methods
 *   }),
 * }));
 *
 * jest.mock('@/contexts/ThemeContext', () => ({
 *   useTheme: () => ({
 *     theme: mockTheme,
 *     isDark: false,
 *     setTheme: jest.fn(),
 *   }),
 * }));
 * ```
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

/**
 * Wrapper component that provides minimal context for tests.
 *
 * Uses React.Fragment to avoid conflicts with test-specific mocks while providing
 * a consistent wrapper interface. Tests MUST mock contexts they depend on via
 * jest.mock() at the module level - see file header for required pattern.
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
