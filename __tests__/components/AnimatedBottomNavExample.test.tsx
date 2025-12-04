/**
 * @fileoverview Tests for AnimatedBottomNavExample component
 *
 * Tests the example/demo component for the AnimatedBottomNav.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AnimatedBottomNavExample from '@/components/AnimatedBottomNavExample';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      text: '#000000',
      textSecondary: '#666666',
      background: '#ffffff',
      card: '#f5f5f5',
      border: '#e0e0e0',
    },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'mock-icon' });
  return {
    Home: MockIcon,
    Briefcase: MockIcon,
    Calendar: MockIcon,
    Shield: MockIcon,
    Settings: MockIcon,
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
  LogCategory: {
    UI: 'ui',
  },
}));

// Mock AnimatedBottomNav component
jest.mock('@/components/AnimatedBottomNav', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');

  interface MockNavItem {
    label: string;
    onPress: () => void;
  }

  const MockAnimatedBottomNav = ({
    items,
    activeIndex,
    onActiveIndexChange,
  }: {
    items: MockNavItem[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
  }) => {
    return React.createElement(
      View,
      { testID: 'animated-bottom-nav' },
      items.map((item: MockNavItem, index: number) =>
        React.createElement(
          TouchableOpacity,
          {
            key: item.label,
            onPress: () => {
              item.onPress();
              onActiveIndexChange(index);
            },
            testID: `nav-item-${item.label}`,
          },
          React.createElement(Text, null, item.label)
        )
      )
    );
  };

  return {
    __esModule: true,
    default: MockAnimatedBottomNav,
  };
});

// =============================================================================
// Tests
// =============================================================================

describe('AnimatedBottomNavExample', () => {
  it('renders demo title', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByText('Animated Bottom Navigation Demo')).toBeTruthy();
  });

  it('renders all navigation items', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Strategy')).toBeTruthy();
    expect(screen.getByText('Period')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('displays active tab label', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByText('Active Tab: Home')).toBeTruthy();
  });

  it('renders feature list', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByText('Features:')).toBeTruthy();
    expect(screen.getByText('• Smooth icon bounce animation')).toBeTruthy();
  });

  it('renders usage example', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByText('Usage:')).toBeTruthy();
  });

  it('changes active tab when nav item is pressed', () => {
    render(<AnimatedBottomNavExample />);

    // Initially shows Home as active
    expect(screen.getByText('Active Tab: Home')).toBeTruthy();

    // Press Settings nav item
    fireEvent.press(screen.getByTestId('nav-item-Settings'));

    // Active tab should change to Settings
    expect(screen.getByText('Active Tab: Settings')).toBeTruthy();
  });

  it('calls logger.debug when nav item is pressed', () => {
    const { logger } = jest.requireMock('@/lib/logger');
    render(<AnimatedBottomNavExample />);

    fireEvent.press(screen.getByTestId('nav-item-Home'));

    expect(logger.debug).toHaveBeenCalledWith('Demo nav item pressed', {
      category: 'ui',
      item: 'Home',
    });
  });

  it('calls logger.debug when Strategy is pressed', () => {
    const { logger } = jest.requireMock('@/lib/logger');
    render(<AnimatedBottomNavExample />);

    fireEvent.press(screen.getByTestId('nav-item-Strategy'));

    expect(logger.debug).toHaveBeenCalledWith('Demo nav item pressed', {
      category: 'ui',
      item: 'Strategy',
    });
  });

  it('calls logger.debug when Period is pressed', () => {
    const { logger } = jest.requireMock('@/lib/logger');
    render(<AnimatedBottomNavExample />);

    fireEvent.press(screen.getByTestId('nav-item-Period'));

    expect(logger.debug).toHaveBeenCalledWith('Demo nav item pressed', {
      category: 'ui',
      item: 'Period',
    });
  });

  it('calls logger.debug when Security is pressed', () => {
    const { logger } = jest.requireMock('@/lib/logger');
    render(<AnimatedBottomNavExample />);

    fireEvent.press(screen.getByTestId('nav-item-Security'));

    expect(logger.debug).toHaveBeenCalledWith('Demo nav item pressed', {
      category: 'ui',
      item: 'Security',
    });
  });

  it('renders the AnimatedBottomNav component', () => {
    render(<AnimatedBottomNavExample />);

    expect(screen.getByTestId('animated-bottom-nav')).toBeTruthy();
  });
});
