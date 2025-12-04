/**
 * @fileoverview Tests for useAppUpdates hook
 *
 * Tests the OTA update functionality including:
 * - Platform support detection
 * - Update checking flow
 * - Update downloading
 * - Update application
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppUpdates } from '@/hooks/useAppUpdates';

// =============================================================================
// Mocks
// =============================================================================

const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: () => mockCheckForUpdateAsync(),
  fetchUpdateAsync: () => mockFetchUpdateAsync(),
  reloadAsync: () => mockReloadAsync(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    UI: 'ui',
  },
}));

// Platform OS is mocked in jest.setup.js as 'ios'
// The global mock provides Platform.OS = 'ios'

// =============================================================================
// Test Suite
// =============================================================================

describe('useAppUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });
    mockFetchUpdateAsync.mockResolvedValue({});
    mockReloadAsync.mockResolvedValue(undefined);

    // Mock __DEV__ as false to simulate production
    // Note: Platform.OS is mocked as 'ios' in jest.setup.js
    (global as any).__DEV__ = false;
  });

  afterEach(() => {
    // Reset __DEV__ to default test value
    (global as any).__DEV__ = false;
  });

  describe('initial state', () => {
    it('returns idle status initially', () => {
      const { result } = renderHook(() => useAppUpdates());

      expect(result.current.status).toBe('idle');
      expect(result.current.isChecking).toBe(false);
      expect(result.current.isDownloading).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });

    it('returns isSupported true on iOS in production', () => {
      // Platform.OS is mocked as 'ios' in jest.setup.js
      (global as any).__DEV__ = false;

      const { result } = renderHook(() => useAppUpdates());

      expect(result.current.isSupported).toBe(true);
    });

    it('returns isSupported false in development mode', () => {
      // Platform.OS is mocked as 'ios' in jest.setup.js
      (global as any).__DEV__ = true;

      const { result } = renderHook(() => useAppUpdates());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('sets checking status while checking', async () => {
      // Make checkForUpdateAsync hang to observe intermediate state
      let resolveCheck: (value: { isAvailable: boolean }) => void;
      mockCheckForUpdateAsync.mockReturnValue(
        new Promise((resolve) => {
          resolveCheck = resolve;
        })
      );

      const { result } = renderHook(() => useAppUpdates());

      // Start checking without awaiting
      const checkPromise = result.current.checkForUpdates();

      // Give it a tick to start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.status).toBe('checking');
      expect(result.current.isChecking).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolveCheck!({ isAvailable: false });
        await checkPromise;
      });
    });

    it('sets up-to-date status when no update available', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.status).toBe('up-to-date');
      expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
    });

    it('downloads update when available', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(mockFetchUpdateAsync).toHaveBeenCalled();
      expect(result.current.status).toBe('ready');
    });

    it('sets downloading status while fetching update', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });

      let resolveFetch: () => void;
      mockFetchUpdateAsync.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() => useAppUpdates());

      const checkPromise = result.current.checkForUpdates();

      // Wait for download to start
      await waitFor(() => {
        expect(result.current.status).toBe('downloading');
      });

      expect(result.current.isDownloading).toBe(true);

      // Complete download
      await act(async () => {
        resolveFetch!();
        await checkPromise;
      });
    });

    it('handles check errors gracefully', async () => {
      mockCheckForUpdateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Network error');
    });

    it('handles download errors gracefully', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
      mockFetchUpdateAsync.mockRejectedValue(new Error('Download failed'));

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Download failed');
    });

    it('handles non-Error exceptions', async () => {
      mockCheckForUpdateAsync.mockRejectedValue('string error');

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Unknown error checking for updates');
    });

    it('sets error status when platform is not supported (dev mode)', async () => {
      // Simulate unsupported platform by setting __DEV__ to true
      (global as any).__DEV__ = true;

      const { result } = renderHook(() => useAppUpdates());

      expect(result.current.isSupported).toBe(false);

      await act(async () => {
        await result.current.checkForUpdates();
      });

      // Should set error without calling any expo-updates functions
      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Updates are not available on this platform');
      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });
  });

  describe('applyUpdate', () => {
    it('does nothing when status is not ready', async () => {
      const { result } = renderHook(() => useAppUpdates());

      expect(result.current.status).toBe('idle');

      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(mockReloadAsync).not.toHaveBeenCalled();
    });

    it('reloads app when status is ready', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });

      const { result } = renderHook(() => useAppUpdates());

      // First get to ready state
      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.status).toBe('ready');

      // Then apply update
      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(mockReloadAsync).toHaveBeenCalled();
    });

    it('handles reload errors gracefully', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
      mockReloadAsync.mockRejectedValue(new Error('Reload failed'));

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Reload failed');
    });

    it('handles non-Error reload exceptions', async () => {
      mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
      mockReloadAsync.mockRejectedValue('reload error string');

      const { result } = renderHook(() => useAppUpdates());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toBe('Failed to reload app');
    });
  });

  describe('return value structure', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useAppUpdates());

      expect(result.current).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          isChecking: expect.any(Boolean),
          isDownloading: expect.any(Boolean),
          errorMessage: null,
          checkForUpdates: expect.any(Function),
          applyUpdate: expect.any(Function),
          isSupported: expect.any(Boolean),
        })
      );
    });
  });
});
