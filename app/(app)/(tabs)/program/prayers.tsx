// =============================================================================
// Imports
// =============================================================================
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import PrayerCard from '@/components/program/PrayerCard';
import type { Prayer } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

type FilterType = 'all' | 'favorites' | 'step' | 'common';

// =============================================================================
// Component
// =============================================================================

/**
 * Prayers screen - displays categorized prayer library with favorites.
 */
export default function PrayersScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const tabBarHeight = useTabBarPadding();

  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchPrayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('prayers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) {
        logger.error('Prayers fetch failed', fetchError as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to load prayers');
      } else {
        logger.debug('Prayers loaded successfully', {
          category: LogCategory.DATABASE,
          count: data?.length,
        });
        setPrayers(data || []);
      }
    } catch (err) {
      logger.error('Prayers fetch exception', err as Error, {
        category: LogCategory.DATABASE,
      });
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_prayer_favorites')
        .select('prayer_id')
        .eq('user_id', profile.id);

      if (fetchError) {
        logger.error('Prayer favorites fetch failed', fetchError as Error, {
          category: LogCategory.DATABASE,
        });
      } else {
        const favoriteIds = new Set(data?.map((f) => f.prayer_id) || []);
        setFavorites(favoriteIds);
      }
    } catch (err) {
      logger.error('Prayer favorites fetch exception', err as Error, {
        category: LogCategory.DATABASE,
      });
    }
  }, [profile]);

  // Fetch data on mount and when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchPrayers();
      fetchFavorites();
    }, [fetchPrayers, fetchFavorites])
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleToggleFavorite = useCallback(
    async (prayerId: string) => {
      if (!profile) return;

      const isFavorite = favorites.has(prayerId);

      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.delete(prayerId);
        } else {
          next.add(prayerId);
        }
        return next;
      });

      try {
        if (isFavorite) {
          const { error: deleteError } = await supabase
            .from('user_prayer_favorites')
            .delete()
            .eq('user_id', profile.id)
            .eq('prayer_id', prayerId);

          if (deleteError) throw deleteError;
          showToast.success('Removed from favorites');
        } else {
          const { error: insertError } = await supabase
            .from('user_prayer_favorites')
            .insert({ user_id: profile.id, prayer_id: prayerId });

          if (insertError) throw insertError;
          showToast.success('Added to favorites');
        }
      } catch (err) {
        // Revert optimistic update
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFavorite) {
            next.add(prayerId);
          } else {
            next.delete(prayerId);
          }
          return next;
        });
        logger.error('Toggle favorite failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        showToast.error('Failed to update favorites');
      }
    },
    [profile, favorites]
  );

  // ---------------------------------------------------------------------------
  // Filtered & Grouped Data
  // ---------------------------------------------------------------------------

  const filteredPrayers = useMemo(() => {
    switch (filter) {
      case 'favorites':
        return prayers.filter((p) => favorites.has(p.id));
      case 'step':
        return prayers.filter((p) => p.category === 'step');
      case 'common':
        return prayers.filter((p) => p.category === 'common');
      default:
        return prayers;
    }
  }, [prayers, favorites, filter]);

  const stepPrayers = useMemo(
    () => filteredPrayers.filter((p) => p.category === 'step'),
    [filteredPrayers]
  );

  const commonPrayers = useMemo(
    () => filteredPrayers.filter((p) => p.category === 'common'),
    [filteredPrayers]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const filterButtons: { key: FilterType; label: string; icon?: boolean }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: 'Favorites', icon: true },
    { key: 'step', label: 'Step' },
    { key: 'common', label: 'Common' },
  ];

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filterButtons.map((btn) => (
            <Pressable
              key={btn.key}
              testID={`filter-${btn.key}`}
              style={[styles.filterButton, filter === btn.key && styles.filterButtonActive]}
              onPress={() => setFilter(btn.key)}
            >
              {btn.icon && (
                <Heart
                  size={14}
                  color={filter === btn.key ? theme.white : theme.textSecondary}
                  fill={filter === btn.key ? theme.white : 'transparent'}
                />
              )}
              <Text
                style={[
                  styles.filterButtonText,
                  filter === btn.key && styles.filterButtonTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        testID="prayers-list"
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
      >
        {loading && (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchPrayers}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && filteredPrayers.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {filter === 'favorites'
                ? 'No favorite prayers yet. Tap the heart icon on any prayer to add it to your favorites.'
                : 'No prayers available'}
            </Text>
          </View>
        )}

        {!loading && !error && filteredPrayers.length > 0 && (
          <>
            {/* Step Prayers Section */}
            {stepPrayers.length > 0 && (filter === 'all' || filter === 'step') && (
              <View style={styles.section}>
                {filter === 'all' && <Text style={styles.sectionTitle}>Step Prayers</Text>}
                {stepPrayers.map((prayer) => (
                  <PrayerCard
                    key={prayer.id}
                    prayer={prayer}
                    isFavorite={favorites.has(prayer.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </View>
            )}

            {/* Common Prayers Section */}
            {commonPrayers.length > 0 && (filter === 'all' || filter === 'common') && (
              <View style={styles.section}>
                {filter === 'all' && <Text style={styles.sectionTitle}>Common Prayers</Text>}
                {commonPrayers.map((prayer) => (
                  <PrayerCard
                    key={prayer.id}
                    prayer={prayer}
                    isFavorite={favorites.has(prayer.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </View>
            )}

            {/* Favorites view - show all without sections */}
            {filter === 'favorites' &&
              filteredPrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isFavorite={favorites.has(prayer.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    filterBar: {
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    filterContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterButtonText: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
      color: theme.textSecondary,
    },
    filterButtonTextActive: {
      color: theme.white,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      marginBottom: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      minHeight: 200,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    errorText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      textAlign: 'center',
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });
