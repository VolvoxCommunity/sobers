import { Platform, Alert } from 'react-native';
import { showAlert, showConfirm } from '@/lib/alert';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('alert utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to ios by default
    (Platform as { OS: string }).OS = 'ios';
    // Mock window.alert and window.confirm for web tests
    global.window = {
      alert: jest.fn(),
      confirm: jest.fn(),
    } as unknown as Window & typeof globalThis;
  });

  describe('showAlert', () => {
    describe('on native (iOS/Android)', () => {
      beforeEach(() => {
        (Platform as { OS: string }).OS = 'ios';
      });

      it('calls Alert.alert with title and message', () => {
        showAlert('Success', 'Profile updated');

        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile updated', undefined);
      });

      it('calls Alert.alert with title only when no message provided', () => {
        showAlert('Error');

        expect(Alert.alert).toHaveBeenCalledWith('Error', undefined, undefined);
      });

      it('passes buttons to Alert.alert', () => {
        const buttons = [
          { text: 'Cancel', style: 'cancel' as const },
          { text: 'OK', onPress: jest.fn() },
        ];

        showAlert('Warning', 'Are you sure?', buttons);

        expect(Alert.alert).toHaveBeenCalledWith('Warning', 'Are you sure?', buttons);
      });

      it('does not call window.alert on native', () => {
        showAlert('Test', 'Message');

        expect(window.alert).not.toHaveBeenCalled();
      });
    });

    describe('on web', () => {
      beforeEach(() => {
        (Platform as { OS: string }).OS = 'web';
      });

      it('calls window.alert with combined title and message', () => {
        showAlert('Success', 'Profile updated');

        expect(window.alert).toHaveBeenCalledWith('Success: Profile updated');
      });

      it('calls window.alert with title only when no message provided', () => {
        showAlert('Error');

        expect(window.alert).toHaveBeenCalledWith('Error');
      });

      it('ignores buttons parameter on web', () => {
        const buttons = [{ text: 'OK' }];

        showAlert('Warning', 'Message', buttons);

        expect(window.alert).toHaveBeenCalledWith('Warning: Message');
        expect(Alert.alert).not.toHaveBeenCalled();
      });

      it('does not call Alert.alert on web', () => {
        showAlert('Test', 'Message');

        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });
  });

  describe('showConfirm', () => {
    describe('on native (iOS/Android)', () => {
      beforeEach(() => {
        (Platform as { OS: string }).OS = 'ios';
      });

      it('returns true when user confirms', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          // Simulate user pressing the confirm button (second button)
          const confirmButton = buttons?.find((b: { text: string }) => b.text !== 'Cancel');
          confirmButton?.onPress?.();
        });

        const result = await showConfirm('Delete', 'Are you sure?');

        expect(result).toBe(true);
      });

      it('returns false when user cancels', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          // Simulate user pressing the cancel button
          const cancelButton = buttons?.find((b: { style: string }) => b.style === 'cancel');
          cancelButton?.onPress?.();
        });

        const result = await showConfirm('Delete', 'Are you sure?');

        expect(result).toBe(false);
      });

      it('uses default button text when not specified', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          expect(buttons).toHaveLength(2);
          expect(buttons[0].text).toBe('Cancel');
          expect(buttons[1].text).toBe('Confirm');
          buttons[0].onPress?.();
        });

        await showConfirm('Title', 'Message');

        expect(Alert.alert).toHaveBeenCalled();
      });

      it('uses custom button text when provided', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          expect(buttons[0].text).toBe('No');
          expect(buttons[1].text).toBe('Yes');
          buttons[0].onPress?.();
        });

        await showConfirm('Title', 'Message', 'Yes', 'No');

        expect(Alert.alert).toHaveBeenCalled();
      });

      it('sets confirm button style to destructive when specified', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          expect(buttons[1].style).toBe('destructive');
          buttons[0].onPress?.();
        });

        await showConfirm('Delete', 'This is permanent', 'Delete', 'Cancel', true);

        expect(Alert.alert).toHaveBeenCalled();
      });

      it('does not call window.confirm on native', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          buttons[0].onPress?.();
        });

        await showConfirm('Title', 'Message');

        expect(window.confirm).not.toHaveBeenCalled();
      });

      it('returns false when alert is dismissed (Android back button)', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, _buttons, options) => {
          // Simulate Android back button dismissing the alert
          options?.onDismiss?.();
        });

        const result = await showConfirm('Delete', 'Are you sure?');

        expect(result).toBe(false);
      });

      it('passes cancelable: true to Alert.alert', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons, options) => {
          expect(options?.cancelable).toBe(true);
          buttons[0].onPress?.();
        });

        await showConfirm('Title', 'Message');

        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    describe('on web', () => {
      beforeEach(() => {
        (Platform as { OS: string }).OS = 'web';
      });

      it('returns true when user confirms', async () => {
        (window.confirm as jest.Mock).mockReturnValue(true);

        const result = await showConfirm('Delete', 'Are you sure?');

        expect(result).toBe(true);
      });

      it('returns false when user cancels', async () => {
        (window.confirm as jest.Mock).mockReturnValue(false);

        const result = await showConfirm('Delete', 'Are you sure?');

        expect(result).toBe(false);
      });

      it('calls window.confirm with combined title and message', async () => {
        (window.confirm as jest.Mock).mockReturnValue(true);

        await showConfirm('Delete Task', 'Are you sure you want to delete this task?');

        expect(window.confirm).toHaveBeenCalledWith(
          'Delete Task\n\nAre you sure you want to delete this task?'
        );
      });

      it('ignores custom button text on web', async () => {
        (window.confirm as jest.Mock).mockReturnValue(true);

        await showConfirm('Title', 'Message', 'Yes', 'No', true);

        // Should still just call confirm with the message
        expect(window.confirm).toHaveBeenCalledWith('Title\n\nMessage');
        expect(Alert.alert).not.toHaveBeenCalled();
      });

      it('does not call Alert.alert on web', async () => {
        (window.confirm as jest.Mock).mockReturnValue(false);

        await showConfirm('Title', 'Message');

        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });
  });
});
