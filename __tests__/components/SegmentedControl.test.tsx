import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SegmentedControl from '@/components/SegmentedControl';

describe('SegmentedControl', () => {
  const defaultProps = {
    segments: ['My Tasks', 'Manage'],
    activeIndex: 0,
    onChange: jest.fn(),
  };

  it('renders all segments', () => {
    let component: ReturnType<typeof renderer.create>;
    act(() => {
      component = renderer.create(
        <ThemeProvider>
          <SegmentedControl {...defaultProps} />
        </ThemeProvider>
      );
    });

    const tree = component.toJSON();
    expect(tree).toBeDefined();

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

    expect(findText(tree, 'My Tasks')).toBe(true);
    expect(findText(tree, 'Manage')).toBe(true);
  });
});
