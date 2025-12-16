// =============================================================================
// Imports
// =============================================================================
import React, { JSX, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Profile } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import { formatProfileName } from '@/lib/format';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the TaskFilters component.
 */
interface TaskFiltersProps {
  /** The current theme */
  theme: ThemeColors;
  /** The current status filter */
  filterStatus: 'all' | 'assigned' | 'completed';
  /** Callback when status filter changes */
  onStatusFilterChange: (status: 'all' | 'assigned' | 'completed') => void;
  /** Optional sponsees list for sponsee filtering */
  sponsees?: Profile[];
  /** Selected sponsee ID for filtering (if sponsees provided) */
  selectedSponseeId?: string;
  /** Callback when sponsee filter changes */
  onSponseeFilterChange?: (sponseeId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * TaskFilters provides filtering options for task lists.
 *
 * @remarks
 * This component displays horizontal scrollable filters for:
 * - Task status (All, Assigned, Completed)
 * - Sponsee selection (if multiple sponsees exist)
 *
 * @example
 * ```tsx
 * <TaskFilters
 *   theme={theme}
 *   filterStatus={filterStatus}
 *   onStatusFilterChange={setFilterStatus}
 *   sponsees={sponsees}
 *   selectedSponseeId={selectedSponseeId}
 *   onSponseeFilterChange={setSelectedSponseeId}
 * />
 * ```
 */
export default function TaskFilters({
  theme,
  filterStatus,
  onStatusFilterChange,
  sponsees,
  selectedSponseeId,
  onSponseeFilterChange,
}: TaskFiltersProps): JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <>
      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => onStatusFilterChange('all')}
            accessibilityRole="button"
            accessibilityLabel="Show all tasks"
            accessibilityState={{ selected: filterStatus === 'all' }}
          >
            <Text
              style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}
            >
              All Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'assigned' && styles.filterChipActive]}
            onPress={() => onStatusFilterChange('assigned')}
            accessibilityRole="button"
            accessibilityLabel="Show assigned tasks"
            accessibilityState={{ selected: filterStatus === 'assigned' }}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'assigned' && styles.filterChipTextActive,
              ]}
            >
              Assigned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
            onPress={() => onStatusFilterChange('completed')}
            accessibilityRole="button"
            accessibilityLabel="Show completed tasks"
            accessibilityState={{ selected: filterStatus === 'completed' }}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'completed' && styles.filterChipTextActive,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Sponsee Filters (only show if multiple sponsees) */}
      {sponsees && sponsees.length > 1 && (
        <View style={styles.sponseeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <TouchableOpacity
              style={[styles.filterChip, selectedSponseeId === 'all' && styles.filterChipActive]}
              onPress={() => onSponseeFilterChange?.('all')}
              accessibilityRole="button"
              accessibilityLabel="Show all sponsees"
              accessibilityState={{ selected: selectedSponseeId === 'all' }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSponseeId === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Sponsees
              </Text>
            </TouchableOpacity>
            {sponsees.map((sponsee) => (
              <TouchableOpacity
                key={sponsee.id}
                style={[
                  styles.filterChip,
                  selectedSponseeId === sponsee.id && styles.filterChipActive,
                ]}
                onPress={() => onSponseeFilterChange?.(sponsee.id)}
                accessibilityRole="button"
                accessibilityLabel={`Show tasks for ${formatProfileName(sponsee)}`}
                accessibilityState={{ selected: selectedSponseeId === sponsee.id }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSponseeId === sponsee.id && styles.filterChipTextActive,
                  ]}
                >
                  {formatProfileName(sponsee)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    filtersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    sponseeFiltersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    filters: {
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    filterChipTextActive: {
      color: theme.textOnPrimary,
    },
  });
