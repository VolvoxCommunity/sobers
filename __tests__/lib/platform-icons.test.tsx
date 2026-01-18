import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { getPlatformIcon, getPlatformLabel, platformLabels } from '@/lib/platform-icons';

// Mock theme for testing
const mockTheme = {
  primary: '#7c3aed',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  textSecondary: '#64748b',
};

describe('platform-icons', () => {
  describe('platformLabels', () => {
    it('contains all expected platforms', () => {
      expect(platformLabels.discord).toBe('Discord');
      expect(platformLabels.telegram).toBe('Telegram');
      expect(platformLabels.whatsapp).toBe('WhatsApp');
      expect(platformLabels.signal).toBe('Signal');
      expect(platformLabels.phone).toBe('Phone');
    });
  });

  describe('getPlatformLabel', () => {
    it('returns correct label for known platforms', () => {
      expect(getPlatformLabel('discord')).toBe('Discord');
      expect(getPlatformLabel('telegram')).toBe('Telegram');
      expect(getPlatformLabel('whatsapp')).toBe('WhatsApp');
      expect(getPlatformLabel('signal')).toBe('Signal');
      expect(getPlatformLabel('phone')).toBe('Phone');
    });

    it('returns the key itself for unknown platforms', () => {
      expect(getPlatformLabel('unknown')).toBe('unknown');
      expect(getPlatformLabel('custom_platform')).toBe('custom_platform');
    });
  });

  describe('getPlatformIcon', () => {
    it('returns an icon for discord', () => {
      const icon = getPlatformIcon('discord', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('returns an icon for telegram', () => {
      const icon = getPlatformIcon('telegram', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('returns an icon for whatsapp', () => {
      const icon = getPlatformIcon('whatsapp', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('returns an icon for signal', () => {
      const icon = getPlatformIcon('signal', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('returns an icon for phone', () => {
      const icon = getPlatformIcon('phone', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('returns a default icon for unknown platforms', () => {
      const icon = getPlatformIcon('unknown', mockTheme);
      const { getByTestId } = render(<View testID="icon-container">{icon}</View>);
      expect(getByTestId('icon-container').children).toHaveLength(1);
    });

    it('respects custom size parameter', () => {
      const icon = getPlatformIcon('discord', mockTheme, 24);
      const { root } = render(<View testID="icon-container">{icon}</View>);
      // Find the icon element (Svg component from lucide-react-native)
      const iconElement = root.findByProps({ testID: 'icon-container' }).props.children;
      expect(iconElement.props.size).toBe(24);
    });

    it('uses default size of 16 when not specified', () => {
      const icon = getPlatformIcon('telegram', mockTheme);
      const { root } = render(<View testID="icon-container">{icon}</View>);
      const iconElement = root.findByProps({ testID: 'icon-container' }).props.children;
      expect(iconElement.props.size).toBe(16);
    });
  });
});
