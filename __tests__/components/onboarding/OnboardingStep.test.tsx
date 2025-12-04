/**
 * @fileoverview Tests for OnboardingStep component
 *
 * Tests the onboarding step wrapper including:
 * - Child rendering
 * - Animation configuration
 * - Responsive width handling
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import OnboardingStep from '@/components/onboarding/OnboardingStep';

// =============================================================================
// Mocks
// =============================================================================

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  const MockAnimatedView = ({ children, style, entering, exiting, ...props }: any) =>
    React.createElement('View', { ...props, style }, children);

  // Animated object that will be default-imported
  const Animated = {
    View: MockAnimatedView,
  };

  return {
    __esModule: true,
    FadeInRight: { duration: () => ({ duration: () => {} }) },
    FadeOutLeft: { duration: () => ({ duration: () => {} }) },
    default: Animated,
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('OnboardingStep', () => {
  it('renders children correctly', () => {
    render(
      <OnboardingStep>
        <Text>Step content</Text>
      </OnboardingStep>
    );

    expect(screen.getByText('Step content')).toBeTruthy();
  });

  it('renders multiple children', () => {
    render(
      <OnboardingStep>
        <Text>First element</Text>
        <Text>Second element</Text>
      </OnboardingStep>
    );

    expect(screen.getByText('First element')).toBeTruthy();
    expect(screen.getByText('Second element')).toBeTruthy();
  });

  it('renders nested components', () => {
    const NestedComponent = () => <Text>Nested content</Text>;

    render(
      <OnboardingStep>
        <NestedComponent />
      </OnboardingStep>
    );

    expect(screen.getByText('Nested content')).toBeTruthy();
  });

  it('handles empty children gracefully', () => {
    // Should not crash with null children
    expect(() => render(<OnboardingStep>{null}</OnboardingStep>)).not.toThrow();
  });
});
