/**
 * @fileoverview Tests for useWhatsNew hook
 *
 * Tests the What's New feature management logic including:
 * - Fetching active releases and features
 * - Determining when to show the What's New popup
 * - Marking releases as seen
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWhatsNew } from '@/lib/whats-new';

// =============================================================================
// Mock Functions
// =============================================================================

const mockRefreshProfile = jest.fn(() => Promise.resolve());
const mockLoggerError = jest.fn();

// =============================================================================
// Mock Profile
// =============================================================================

const mockProfile = {
  id: 'user-123',
  last_seen_version: null as string | null,
};

// =============================================================================
// Mocks
// =============================================================================

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    refreshProfile: mockRefreshProfile,
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'DATABASE',
  },
}));

// Mock Supabase
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockActiveRelease = {
  id: 'release-1',
  version: '2.0.0',
  title: "What's New in Sobers",
};

const mockFeatures = [
  {
    id: 'feature-1',
    title: 'Dark Mode',
    description: 'Now supports dark mode for easier viewing at night.',
    image_path: 'dark-mode.png',
    display_order: 1,
  },
  {
    id: 'feature-2',
    title: 'Improved Calendar',
    description: 'Track your progress with our new calendar view.',
    image_path: null,
    display_order: 2,
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('useWhatsNew', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mockProfile to default values
    mockProfile.id = 'user-123';
    mockProfile.last_seen_version = null;

    // Default mock: no active release
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      }),
    }));
  });

  describe('when no active release exists', () => {
    it('returns shouldShowWhatsNew as false', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
    });

    it('handles PGRST116 error gracefully (no rows found)', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      }));

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
      // Should not log error for expected "no rows" case
      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });

  describe('when active release exists and user has not seen it', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = null;

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('returns shouldShowWhatsNew as true', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(true);
    });

    it('returns the active release data', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeRelease).toEqual({
        id: 'release-1',
        version: '2.0.0',
        title: "What's New in Sobers",
        features: expect.any(Array),
      });
      expect(result.current.activeRelease?.features).toHaveLength(2);
    });

    it('transforms features with correct image URLs', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const features = result.current.activeRelease?.features;

      // Feature with image_path should have full URL
      expect(features?.[0]).toEqual({
        id: 'feature-1',
        title: 'Dark Mode',
        description: 'Now supports dark mode for easier viewing at night.',
        imageUrl: expect.stringContaining('dark-mode.png'),
        displayOrder: 1,
      });

      // Feature without image_path should have null imageUrl
      expect(features?.[1]).toEqual({
        id: 'feature-2',
        title: 'Improved Calendar',
        description: 'Track your progress with our new calendar view.',
        imageUrl: null,
        displayOrder: 2,
      });
    });

    it('orders features by display_order', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const features = result.current.activeRelease?.features;
      expect(features?.[0].displayOrder).toBe(1);
      expect(features?.[1].displayOrder).toBe(2);
    });
  });

  describe('when active release exists and user already saw it', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = '2.0.0'; // Same as release version

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('returns shouldShowWhatsNew as false', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
    });

    it('still returns the active release data', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeRelease).not.toBeNull();
      expect(result.current.activeRelease?.version).toBe('2.0.0');
    });
  });

  describe('markAsSeen', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = null;

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        if (table === 'profiles') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('updates profile and calls refreshProfile', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsSeen();
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockRefreshProfile).toHaveBeenCalled();
    });

    it('does nothing when no profile exists', async () => {
      // Temporarily set profile to null-like state
      const originalId = mockProfile.id;
      // @ts-expect-error - intentionally setting to null for test
      mockProfile.id = null;

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsSeen();
      });

      // Should not call refreshProfile since there's no profile
      expect(mockRefreshProfile).not.toHaveBeenCalled();

      // Restore profile
      mockProfile.id = originalId;
    });

    it('does nothing when no active release exists', async () => {
      // Reset to no active release
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      }));

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsSeen();
      });

      // Should not call refreshProfile since there's no release
      expect(mockRefreshProfile).not.toHaveBeenCalled();
    });

    it('handles update error gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        if (table === 'profiles') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed', code: '500' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw
      await act(async () => {
        await result.current.markAsSeen();
      });

      // Should log the error
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to mark What's New as seen",
        expect.any(Object),
        expect.objectContaining({ category: 'DATABASE' })
      );

      // Should not call refreshProfile on error
      expect(mockRefreshProfile).not.toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('refetches active release data', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to track refetch calls
      jest.clearAllMocks();

      await act(async () => {
        await result.current.refetch();
      });

      // Should have called supabase.from again
      expect(mockSupabaseFrom).toHaveBeenCalledWith('whats_new_releases');
    });
  });

  describe('error handling', () => {
    it('handles release fetch error gracefully', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Internal server error' },
        }),
      }));

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to fetch What's New release",
        expect.any(Object),
        expect.objectContaining({ category: 'DATABASE' })
      );
    });

    it('handles features fetch error gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '500', message: 'Internal server error' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to fetch What's New release",
        expect.any(Object),
        expect.objectContaining({ category: 'DATABASE' })
      );
    });

    it('handles null release data gracefully', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }));

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
    });
  });

  describe('loading state', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useWhatsNew());

      expect(result.current.isLoading).toBe(true);
    });

    it('transitions to not loading after fetch', async () => {
      const { result } = renderHook(() => useWhatsNew());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets loading during refetch', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger refetch
      act(() => {
        result.current.refetch();
      });

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('version comparison', () => {
    beforeEach(() => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockActiveRelease,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockFeatures,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows popup when user has seen older version', async () => {
      mockProfile.last_seen_version = '1.0.0'; // Older than release version

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(true);
    });

    it('hides popup when versions match exactly', async () => {
      mockProfile.last_seen_version = '2.0.0'; // Same as release version

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
    });

    it('shows popup when user has never seen any version', async () => {
      mockProfile.last_seen_version = null;

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(true);
    });
  });

  describe('return values', () => {
    it('returns all expected properties', async () => {
      const { result } = renderHook(() => useWhatsNew());

      // Check that all required properties exist with correct types
      expect(typeof result.current.shouldShowWhatsNew).toBe('boolean');
      expect('activeRelease' in result.current).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.markAsSeen).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
