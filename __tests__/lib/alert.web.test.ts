/**
 * Tests for web alert implementation.
 *
 * @jest-environment jsdom
 */

import { showAlertPlatform, showConfirmPlatform } from '@/lib/alert/platform.web';

describe('Web Alert', () => {
  let mockAlert: jest.SpyInstance;
  let mockConfirm: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    mockConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    mockAlert.mockRestore();
    mockConfirm.mockRestore();
  });

  describe('showAlertPlatform', () => {
    it('calls window.alert with combined title and message', () => {
      showAlertPlatform('Success', 'Profile updated');

      expect(mockAlert).toHaveBeenCalledWith('Success: Profile updated');
    });

    it('calls window.alert with title only when no message provided', () => {
      showAlertPlatform('Error');

      expect(mockAlert).toHaveBeenCalledWith('Error');
    });

    it('ignores buttons parameter on web', () => {
      const buttons = [{ text: 'OK' }];

      showAlertPlatform('Warning', 'Message', buttons);

      expect(mockAlert).toHaveBeenCalledWith('Warning: Message');
    });
  });

  describe('showConfirmPlatform', () => {
    it('returns true when user confirms', async () => {
      mockConfirm.mockReturnValue(true);

      const result = await showConfirmPlatform('Delete', 'Are you sure?');

      expect(result).toBe(true);
    });

    it('returns false when user cancels', async () => {
      mockConfirm.mockReturnValue(false);

      const result = await showConfirmPlatform('Delete', 'Are you sure?');

      expect(result).toBe(false);
    });

    it('calls window.confirm with combined title and message', async () => {
      mockConfirm.mockReturnValue(true);

      await showConfirmPlatform('Delete Task', 'Are you sure you want to delete this task?');

      expect(mockConfirm).toHaveBeenCalledWith(
        'Delete Task\n\nAre you sure you want to delete this task?'
      );
    });

    it('ignores custom button text on web', async () => {
      mockConfirm.mockReturnValue(true);

      await showConfirmPlatform('Title', 'Message', 'Yes', 'No', true);

      // Should still just call confirm with the message
      expect(mockConfirm).toHaveBeenCalledWith('Title\n\nMessage');
    });
  });
});
