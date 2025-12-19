/**
 * Tests for native alert implementation.
 *
 * @jest-environment node
 */

import { Alert } from 'react-native';
import { showAlertPlatform, showConfirmPlatform } from '@/lib/alert/platform.native';

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Native Alert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showAlertPlatform', () => {
    it('calls Alert.alert with title and message', () => {
      showAlertPlatform('Success', 'Profile updated');

      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile updated', undefined);
    });

    it('calls Alert.alert with title only when no message provided', () => {
      showAlertPlatform('Error');

      expect(Alert.alert).toHaveBeenCalledWith('Error', undefined, undefined);
    });

    it('passes buttons to Alert.alert', () => {
      const buttons = [
        { text: 'Cancel', style: 'cancel' as const },
        { text: 'OK', onPress: jest.fn() },
      ];

      showAlertPlatform('Warning', 'Are you sure?', buttons);

      expect(Alert.alert).toHaveBeenCalledWith('Warning', 'Are you sure?', buttons);
    });
  });

  describe('showConfirmPlatform', () => {
    it('returns true when user confirms', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        // Simulate user pressing the confirm button (second button)
        const confirmButton = buttons?.find((b: { text: string }) => b.text !== 'Cancel');
        confirmButton?.onPress?.();
      });

      const result = await showConfirmPlatform('Delete', 'Are you sure?');

      expect(result).toBe(true);
    });

    it('returns false when user cancels', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        // Simulate user pressing the cancel button
        const cancelButton = buttons?.find((b: { style: string }) => b.style === 'cancel');
        cancelButton?.onPress?.();
      });

      const result = await showConfirmPlatform('Delete', 'Are you sure?');

      expect(result).toBe(false);
    });

    it('uses default button text when not specified', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        expect(buttons).toHaveLength(2);
        expect(buttons[0].text).toBe('Cancel');
        expect(buttons[1].text).toBe('Confirm');
        buttons[0].onPress?.();
      });

      await showConfirmPlatform('Title', 'Message');

      expect(Alert.alert).toHaveBeenCalled();
    });

    it('uses custom button text when provided', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        expect(buttons[0].text).toBe('No');
        expect(buttons[1].text).toBe('Yes');
        buttons[0].onPress?.();
      });

      await showConfirmPlatform('Title', 'Message', 'Yes', 'No');

      expect(Alert.alert).toHaveBeenCalled();
    });

    it('sets confirm button style to destructive when specified', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
        expect(buttons[1].style).toBe('destructive');
        buttons[0].onPress?.();
      });

      await showConfirmPlatform('Delete', 'This is permanent', 'Delete', 'Cancel', true);

      expect(Alert.alert).toHaveBeenCalled();
    });

    it('returns false when alert is dismissed (Android back button)', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, _buttons, options) => {
        // Simulate Android back button dismissing the alert
        options?.onDismiss?.();
      });

      const result = await showConfirmPlatform('Delete', 'Are you sure?');

      expect(result).toBe(false);
    });

    it('passes cancelable: true to Alert.alert', async () => {
      (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons, options) => {
        expect(options?.cancelable).toBe(true);
        buttons[0].onPress?.();
      });

      await showConfirmPlatform('Title', 'Message');

      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
