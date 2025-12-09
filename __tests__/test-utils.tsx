/**
 * @fileoverview Test utilities for React Native Testing Library
 *
 * Provides shared test helpers for wrapping components with required providers.
 * All tests should use renderWithProviders instead of custom wrapper implementations.
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

/**
 * Wrapper component that provides AuthContext and ThemeContext for tests.
 *
 * @param children - React children to wrap with providers
 * @returns Component tree with providers
 */
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
};

/**
 * Renders a React component with all required providers (AuthContext and ThemeContext).
 *
 * This is the standard way to render components in tests. It ensures components
 * have access to both authentication and theme contexts.
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
