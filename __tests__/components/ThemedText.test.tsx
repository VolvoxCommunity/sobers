/**
 * @fileoverview Tests for ThemedText component
 *
 * Tests the themed text component including:
 * - Default variant rendering
 * - All variant styles (title, subtitle, caption)
 * - Custom style overrides
 * - Props passthrough
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ThemedText from '@/components/ThemedText';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  text: '#000000',
  textSecondary: '#666666',
  primary: '#007AFF',
  background: '#ffffff',
  card: '#f5f5f5',
  border: '#e0e0e0',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('ThemedText', () => {
  describe('rendering', () => {
    it('renders text content', () => {
      render(<ThemedText>Hello World</ThemedText>);

      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('renders without crashing with empty children', () => {
      render(<ThemedText testID="empty-text">{''}</ThemedText>);

      expect(screen.getByTestId('empty-text')).toBeTruthy();
    });

    it('applies default variant styles when no variant specified', () => {
      render(<ThemedText testID="themed-text">Default Text</ThemedText>);

      const text = screen.getByTestId('themed-text');
      const styles = text.props.style;

      // Default variant should have fontSize 16 and theme.text color
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
            color: '#000000',
          }),
        ])
      );
    });
  });

  describe('variants', () => {
    it('applies title variant styles', () => {
      render(
        <ThemedText testID="title-text" variant="title">
          Title Text
        </ThemedText>
      );

      const text = screen.getByTestId('title-text');
      const styles = text.props.style;

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 24,
            fontWeight: '700',
            color: '#000000',
          }),
        ])
      );
    });

    it('applies subtitle variant styles', () => {
      render(
        <ThemedText testID="subtitle-text" variant="subtitle">
          Subtitle Text
        </ThemedText>
      );

      const text = screen.getByTestId('subtitle-text');
      const styles = text.props.style;

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }),
        ])
      );
    });

    it('applies caption variant styles with secondary color', () => {
      render(
        <ThemedText testID="caption-text" variant="caption">
          Caption Text
        </ThemedText>
      );

      const text = screen.getByTestId('caption-text');
      const styles = text.props.style;

      // Caption uses textSecondary color
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 12,
            color: '#666666',
          }),
        ])
      );
    });

    it('applies default variant explicitly', () => {
      render(
        <ThemedText testID="default-text" variant="default">
          Default Text
        </ThemedText>
      );

      const text = screen.getByTestId('default-text');
      const styles = text.props.style;

      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 16,
            color: '#000000',
          }),
        ])
      );
    });
  });

  describe('style overrides', () => {
    it('allows custom style to override variant styles', () => {
      render(
        <ThemedText testID="custom-text" style={{ color: 'red', fontSize: 20 }}>
          Custom Styled Text
        </ThemedText>
      );

      const text = screen.getByTestId('custom-text');
      const styles = text.props.style;

      // Custom styles should be after variant styles in the array
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: 'red', fontSize: 20 })])
      );
    });

    it('merges custom style with variant styles', () => {
      render(
        <ThemedText testID="merged-text" variant="title" style={{ marginTop: 10 }}>
          Merged Styled Text
        </ThemedText>
      );

      const text = screen.getByTestId('merged-text');
      const styles = text.props.style;

      // Should have both variant styles and custom styles
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 24,
            fontWeight: '700',
          }),
          expect.objectContaining({
            marginTop: 10,
          }),
        ])
      );
    });
  });

  describe('props passthrough', () => {
    it('passes through numberOfLines prop', () => {
      render(
        <ThemedText testID="truncated-text" numberOfLines={2}>
          Long text that should be truncated after two lines
        </ThemedText>
      );

      const text = screen.getByTestId('truncated-text');
      expect(text.props.numberOfLines).toBe(2);
    });

    it('passes through ellipsizeMode prop', () => {
      render(
        <ThemedText testID="ellipsis-text" ellipsizeMode="tail">
          Text with ellipsis
        </ThemedText>
      );

      const text = screen.getByTestId('ellipsis-text');
      expect(text.props.ellipsizeMode).toBe('tail');
    });

    it('passes through accessible and accessibilityLabel props', () => {
      render(
        <ThemedText testID="accessible-text" accessible accessibilityLabel="Accessible text">
          Accessible Text
        </ThemedText>
      );

      const text = screen.getByTestId('accessible-text');
      expect(text.props.accessible).toBe(true);
      expect(text.props.accessibilityLabel).toBe('Accessible text');
    });

    it('passes through onPress prop', () => {
      const mockOnPress = jest.fn();
      render(
        <ThemedText testID="pressable-text" onPress={mockOnPress}>
          Pressable Text
        </ThemedText>
      );

      const text = screen.getByTestId('pressable-text');
      expect(text.props.onPress).toBe(mockOnPress);
    });
  });
});
