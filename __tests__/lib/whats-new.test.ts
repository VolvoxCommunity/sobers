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
  created_at: '2024-12-01T00:00:00Z',
};

const mockFeatures = [
  {
    id: 'feature-1',
    title: 'Dark Mode',
    description: 'Now supports dark mode for easier viewing at night.',
    image_path: 'dark-mode.png',
    display_order: 1,
    type: 'feature',
    release_id: 'release-1',
  },
  {
    id: 'feature-2',
    title: 'Improved Calendar',
    description: 'Track your progress with our new calendar view.',
    image_path: null,
    display_order: 2,
    type: 'fix',
    release_id: 'release-1',
  },
];

const mockMultipleReleases = [
  {
    id: 'release-3',
    version: '3.0.0',
    title: 'Major Update',
    created_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'release-2',
    version: '2.0.0',
    title: 'Feature Release',
    created_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'release-1',
    version: '1.0.0',
    title: 'Initial Release',
    created_at: '2024-10-01T00:00:00Z',
  },
];

const mockMultipleFeatures = [
  {
    id: 'feature-1',
    title: 'Dark Mode',
    description: 'Now supports dark mode for easier viewing at night.',
    image_path: 'dark-mode.png',
    display_order: 1,
    type: 'feature',
    release_id: 'release-3',
  },
  {
    id: 'feature-2',
    title: 'Improved Calendar',
    description: 'Track your progress with our new calendar view.',
    image_path: null,
    display_order: 2,
    type: 'fix',
    release_id: 'release-3',
  },
  {
    id: 'feature-3',
    title: 'Feature Release Feature',
    description: 'A feature from the 2.0.0 release.',
    image_path: null,
    display_order: 1,
    type: 'feature',
    release_id: 'release-2',
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

    // Default mock: no releases
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'whats_new_releases') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      if (table === 'whats_new_features') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
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

  describe('when no releases exist', () => {
    it('returns shouldShowWhatsNew as false', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.releases).toEqual([]);
    });

    it('handles empty releases array gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [],
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

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.releases).toEqual([]);
      // Should not log error for empty case
      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });

  describe('when releases exist and user has not seen latest', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = null;

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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

    it('returns the releases array with latest first', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.releases).toHaveLength(1);
      expect(result.current.releases[0]).toEqual({
        id: 'release-1',
        version: '2.0.0',
        title: "What's New in Sobers",
        createdAt: '2024-12-01T00:00:00Z',
        features: expect.any(Array),
      });
      expect(result.current.releases[0].features).toHaveLength(2);
    });

    it('transforms features with correct image URLs', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const features = result.current.releases[0]?.features;

      // Feature with image_path should have full URL
      expect(features?.[0]).toEqual({
        id: 'feature-1',
        title: 'Dark Mode',
        description: 'Now supports dark mode for easier viewing at night.',
        imageUrl: expect.stringContaining('dark-mode.png'),
        displayOrder: 1,
        type: 'feature',
      });

      // Feature without image_path should have null imageUrl
      expect(features?.[1]).toEqual({
        id: 'feature-2',
        title: 'Improved Calendar',
        description: 'Track your progress with our new calendar view.',
        imageUrl: null,
        displayOrder: 2,
        type: 'fix',
      });
    });

    it('orders features by display_order', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const features = result.current.releases[0]?.features;
      expect(features?.[0].displayOrder).toBe(1);
      expect(features?.[1].displayOrder).toBe(2);
    });
  });

  describe('when releases exist and user already saw latest', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = '2.0.0'; // Same as release version

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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

    it('still returns the releases data', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.releases).toHaveLength(1);
      expect(result.current.releases[0].version).toBe('2.0.0');
    });
  });

  describe('markAsSeen', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = null;

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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

    it('does nothing when no releases exist', async () => {
      // Reset to no releases
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [],
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
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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
    it('refetches release data', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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

  describe('edge cases for data transformation', () => {
    it('handles null features data with no error (defaults to empty array)', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: null, // null data, no error
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

      // Should still have the release, just with empty features
      expect(result.current.releases).toHaveLength(1);
      expect(result.current.releases[0].features).toEqual([]);
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('defaults feature type to "feature" when type is null', async () => {
      const featureWithNullType = {
        id: 'feature-null-type',
        title: 'Feature with null type',
        description: 'Testing null type fallback',
        image_path: null,
        display_order: 1,
        type: null, // null type should default to 'feature'
        release_id: 'release-1',
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [featureWithNullType],
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

      expect(result.current.releases[0].features[0].type).toBe('feature');
    });

    it('defaults feature type to "feature" when type is undefined', async () => {
      const featureWithUndefinedType = {
        id: 'feature-undefined-type',
        title: 'Feature with undefined type',
        description: 'Testing undefined type fallback',
        image_path: null,
        display_order: 1,
        type: undefined, // undefined type should default to 'feature'
        release_id: 'release-1',
      };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [featureWithUndefinedType],
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

      expect(result.current.releases[0].features[0].type).toBe('feature');
    });
  });

  describe('error handling', () => {
    it('handles release fetch error gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
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
      expect(result.current.releases).toEqual([]);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to fetch What's New releases",
        expect.any(Object),
        expect.objectContaining({ category: 'DATABASE' })
      );
    });

    it('handles features fetch error gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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
      expect(result.current.releases).toEqual([]);
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to fetch What's New releases",
        expect.any(Object),
        expect.objectContaining({ category: 'DATABASE' })
      );
    });

    it('handles null release data gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
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

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.releases).toEqual([]);
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
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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
            order: jest.fn().mockResolvedValue({
              data: [mockActiveRelease],
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
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
      expect('releases' in result.current).toBe(true);
      expect(Array.isArray(result.current.releases)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.markAsSeen).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('multiple releases', () => {
    beforeEach(() => {
      mockProfile.last_seen_version = '2.0.0';

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockMultipleReleases,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockMultipleFeatures,
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

    it('returns all releases sorted by version descending', async () => {
      const { result } = renderHook(() => useWhatsNew());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.releases).toHaveLength(3);
      expect(result.current.releases[0].version).toBe('3.0.0');
      expect(result.current.releases[1].version).toBe('2.0.0');
      expect(result.current.releases[2].version).toBe('1.0.0');
    });

    it('includes createdAt in release data', async () => {
      const { result } = renderHook(() => useWhatsNew());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.releases[0].createdAt).toBe('2024-12-01T00:00:00Z');
      expect(result.current.releases[1].createdAt).toBe('2024-11-01T00:00:00Z');
      expect(result.current.releases[2].createdAt).toBe('2024-10-01T00:00:00Z');
    });

    it('shouldShowWhatsNew is true when latest version differs from last_seen_version', async () => {
      const { result } = renderHook(() => useWhatsNew());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Latest is 3.0.0, user saw 2.0.0
      expect(result.current.shouldShowWhatsNew).toBe(true);
    });

    it('groups features by release', async () => {
      const { result } = renderHook(() => useWhatsNew());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Release 3.0.0 should have 2 features
      expect(result.current.releases[0].features).toHaveLength(2);
      // Release 2.0.0 should have 1 feature
      expect(result.current.releases[1].features).toHaveLength(1);
      // Release 1.0.0 should have 0 features
      expect(result.current.releases[2].features).toHaveLength(0);
    });

    it('markAsSeen updates with latest release version', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'whats_new_releases') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockMultipleReleases,
              error: null,
            }),
          };
        }
        if (table === 'whats_new_features') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockMultipleFeatures,
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

      const { result } = renderHook(() => useWhatsNew());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.markAsSeen();
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });
});
