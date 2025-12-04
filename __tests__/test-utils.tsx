import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';

/**
 * Test utility to render components wrapped with any required providers.
 *
 * @param ui - The React element to render
 * @param options - Optional render options from React Native Testing Library
 * @returns The render result
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'queries'>
) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}
