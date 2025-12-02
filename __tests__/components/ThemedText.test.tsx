/**
 * Tests for ThemedText component
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ThemedText from '@/components/ThemedText';

describe('ThemedText', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    let tree: ReturnType<typeof renderer.create>;
    act(() => {
      tree = renderer.create(<ThemeProvider>{component}</ThemeProvider>);
    });
    return tree!;
  };

  describe('rendering', () => {
    it('renders text content correctly', () => {
      const component = renderWithTheme(<ThemedText>Hello World</ThemedText>);
      const tree = component.toJSON();
      expect(tree).toBeDefined();

      // Find the text content
      const findText = (node: any, text: string): boolean => {
        if (!node) return false;
        if (node.children && node.children.includes(text)) return true;
        if (Array.isArray(node)) {
          return node.some((child) => findText(child, text));
        }
        if (node.children) {
          return findText(node.children, text);
        }
        return false;
      };

      expect(findText(tree, 'Hello World')).toBe(true);
    });

    it('renders without crashing with empty children', () => {
      const component = renderWithTheme(<ThemedText>{''}</ThemedText>);
      const tree = component.toJSON();
      expect(tree).toBeDefined();
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const component = renderWithTheme(<ThemedText variant="default">Default Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Default variant should have fontSize 16
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 16 })])
      );
    });

    it('renders title variant', () => {
      const component = renderWithTheme(<ThemedText variant="title">Title Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Title variant should have fontSize 24 and fontWeight 700
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 24, fontWeight: '700' })])
      );
    });

    it('renders subtitle variant', () => {
      const component = renderWithTheme(<ThemedText variant="subtitle">Subtitle Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Subtitle variant should have fontSize 18 and fontWeight 600
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 18, fontWeight: '600' })])
      );
    });

    it('renders caption variant', () => {
      const component = renderWithTheme(<ThemedText variant="caption">Caption Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Caption variant should have fontSize 12
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 12 })])
      );
    });

    it('uses default variant when no variant prop is provided', () => {
      const component = renderWithTheme(<ThemedText>No Variant</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Should use default variant with fontSize 16
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 16 })])
      );
    });
  });

  describe('style merging', () => {
    it('merges custom styles with variant styles', () => {
      const customStyle = { marginTop: 10, padding: 5 };
      const component = renderWithTheme(<ThemedText style={customStyle}>Styled Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Should have both variant styles and custom styles
      expect(tree.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 16 }), // default variant
          expect.objectContaining({ marginTop: 10, padding: 5 }), // custom style
        ])
      );
    });

    it('allows custom style to override variant styles', () => {
      const customStyle = { fontSize: 20 };
      const component = renderWithTheme(<ThemedText style={customStyle}>Override Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      // Custom style should be in the array (will override due to array order)
      expect(tree.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ fontSize: 20 })])
      );
    });
  });

  describe('props forwarding', () => {
    it('forwards additional Text props', () => {
      const component = renderWithTheme(
        <ThemedText numberOfLines={2} ellipsizeMode="tail">
          Long text that might be truncated
        </ThemedText>
      );
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      expect(tree.props.numberOfLines).toBe(2);
      expect(tree.props.ellipsizeMode).toBe('tail');
    });

    it('forwards testID prop', () => {
      const component = renderWithTheme(<ThemedText testID="test-text">Test ID Text</ThemedText>);
      const tree = component.toJSON() as any;
      expect(tree).toBeDefined();
      expect(tree.props.testID).toBe('test-text');
    });
  });
});
