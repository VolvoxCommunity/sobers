/**
 * Tests for alert module public API and fallback implementation.
 *
 * Platform-specific tests are in:
 * - alert.native.test.ts (iOS/Android)
 * - alert.web.test.ts (Web)
 */

// Test that types are exported correctly
import type { AlertButton } from '@/lib/alert';

// Mock logger for fallback implementation - must be before requireActual
const mockLoggerWarn = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
  LogCategory: {
    NAVIGATION: 'navigation',
  },
}));

// Get the actual fallback platform implementation (bypasses the global mock)
// We need to use requireActual since jest.setup.js mocks @/lib/alert/platform
const { showAlertPlatform, showConfirmPlatform } = jest.requireActual(
  '@/lib/alert/platform'
) as typeof import('@/lib/alert/platform');

describe('Alert Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type exports', () => {
    it('exports AlertButton type', () => {
      // TypeScript compile-time check - if this compiles, the type is exported
      const button: AlertButton = {
        text: 'OK',
        style: 'default',
        onPress: () => {},
      };
      expect(button.text).toBe('OK');
    });
  });

  describe('Fallback Platform Implementation', () => {
    describe('showAlertPlatform', () => {
      it('logs a warning with title and message', () => {
        showAlertPlatform('Test Title', 'Test message');

        expect(mockLoggerWarn).toHaveBeenCalledWith('Alert (fallback): Test Title: Test message', {
          category: 'navigation',
        });
      });

      it('logs a warning with title only when no message', () => {
        showAlertPlatform('Error');

        expect(mockLoggerWarn).toHaveBeenCalledWith('Alert (fallback): Error', {
          category: 'navigation',
        });
      });
    });

    describe('showConfirmPlatform', () => {
      it('logs a warning and returns false', async () => {
        const result = await showConfirmPlatform('Confirm', 'Are you sure?');

        expect(result).toBe(false);
        expect(mockLoggerWarn).toHaveBeenCalledWith('Confirm (fallback): Confirm: Are you sure?', {
          category: 'navigation',
        });
      });
    });
  });
});
