/**
 * @fileoverview Tests for the Buddy tab screen
 *
 * Tests the Sobers Buddy placeholder screen including:
 * - Rendering the coming soon message
 * - Displaying feature list
 * - Personalized greeting with display name
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BuddyScreen from '@/app/(app)/(tabs)/buddy';

// =============================================================================
// Mocks
// =============================================================================

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
  ai_buddy_enabled: true,
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      primaryLight: '#E5F1FF',
      text: '#111827',
      textSecondary: '#6b7280',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 0,
}));

jest.mock('@/components/navigation/SettingsButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'settings-button' }),
  };
});

jest.mock('lucide-react-native', () => ({
  Bot: () => null,
}));

jest.mock('@/lib/format', () => ({
  hexWithAlpha: (hex: string, _alpha: number) => hex,
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('BuddyScreen', () => {
  it('renders the title', () => {
    render(<BuddyScreen />);

    expect(screen.getByText('Sobers Buddy')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<BuddyScreen />);

    expect(screen.getByText('Your AI-powered accountability partner')).toBeTruthy();
  });

  it('renders the coming soon card', () => {
    render(<BuddyScreen />);

    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('includes personalized greeting with display name', () => {
    render(<BuddyScreen />);

    expect(screen.getByText(/Hey Test User!/)).toBeTruthy();
  });

  it('renders feature list items', () => {
    render(<BuddyScreen />);

    expect(screen.getByText('💬 Real-time chat conversations')).toBeTruthy();
    expect(screen.getByText('🎯 Personalized recovery support')).toBeTruthy();
    expect(screen.getByText('🔒 Private and secure')).toBeTruthy();
    expect(screen.getByText('🤝 Non-judgmental, always supportive')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<BuddyScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
