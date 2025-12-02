import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SignupScreen from '@/app/signup';

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Heart: (props: any) => <View testID="heart-icon" {...props} />,
    ArrowLeft: (props: any) => <View testID="arrow-left-icon" {...props} />,
  };
});

// Mock the social logos component
jest.mock('@/components/auth/SocialLogos', () => ({
  GoogleLogo: () => null,
}));

// Mock AppleSignInButton component
jest.mock('@/components/auth/AppleSignInButton', () => ({
  AppleSignInButton: () => null,
}));

describe('SignupScreen', () => {
  describe('Back Button', () => {
    it('uses theme text color instead of hardcoded color', () => {
      render(
        <ThemeProvider>
          <SignupScreen />
        </ThemeProvider>
      );

      const arrowLeftIcon = screen.getByTestId('arrow-left-icon');

      // The icon should use theme.text color (#111827 for light theme)
      // not the hardcoded #374151
      expect(arrowLeftIcon).toBeDefined();
      expect(arrowLeftIcon.props.color).toBe('#111827');
    });
  });
});
