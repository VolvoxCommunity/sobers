import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StepContent, UserStepProgress } from '@/types/database';
import { CheckCircle } from 'lucide-react-native';
import { logger, LogCategory } from '@/lib/logger';

/**
 * Display the list of the 12 steps with per-step completion indicators and navigation to each step's detail screen.
 *
 * Renders a header, handles loading/error/empty states, and shows a scrollable list of step cards; tapping a card navigates to /steps/{id}.
 *
 * @returns The rendered Steps list screen component
 */
export default function StepsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  // Get safe area insets for scroll padding
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? insets.bottom : 0;
  const [steps, setSteps] = useState<StepContent[]>([]);
  const [progress, setProgress] = useState<Record<number, UserStepProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_step_progress')
        .select('*')
        .eq('user_id', profile.id);

      if (fetchError) {
        logger.error('Step progress fetch failed', fetchError as Error, {
          category: LogCategory.DATABASE,
        });
      } else {
        const progressMap: Record<number, UserStepProgress> = {};
        data?.forEach((p) => {
          progressMap[p.step_number] = p;
        });
        setProgress(progressMap);
      }
    } catch (err) {
      logger.error('Step progress fetch exception', err as Error, {
        category: LogCategory.DATABASE,
      });
    }
  }, [profile]);

  const fetchSteps = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('steps_content')
        .select('*')
        .order('step_number');

      if (fetchError) {
        logger.error('Steps content fetch failed', fetchError as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to load steps content');
      } else {
        logger.debug('Steps content loaded successfully', {
          category: LogCategory.DATABASE,
          count: data?.length,
        });
        setSteps(data || []);
      }
    } catch (err) {
      logger.error('Steps content fetch exception', err as Error, {
        category: LogCategory.DATABASE,
      });
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch steps on mount
  useEffect(() => {
    fetchSteps();
  }, []);

  // Refetch progress when screen gains focus (e.g., returning from detail screen)
  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [fetchProgress])
  );

  /**
   * Handler for when a step is selected.
   * Navigates to the dedicated step detail screen.
   *
   * @param step - The step that was selected
   */
  const handleStepPress = (step: StepContent) => {
    router.push(`/steps/${step.id}`);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The 12 Steps</Text>
        <Text style={styles.headerSubtitle}>Your path to recovery</Text>
      </View>

      <ScrollView
        testID="steps-list"
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
      >
        {loading && (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading steps...</Text>
          </View>
        )}
        {error && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchSteps}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {!loading && !error && steps.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No steps content available</Text>
          </View>
        )}
        {!loading &&
          !error &&
          steps.map((step) => {
            const isCompleted = !!progress[step.step_number];
            return (
              <Pressable
                testID={`step-card-${step.step_number}`}
                key={step.id}
                style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}
                onPress={() => handleStepPress(step)}
              >
                <View style={[styles.stepNumber, isCompleted && styles.stepNumberCompleted]}>
                  <Text style={styles.stepNumberText}>{step.step_number}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription} numberOfLines={2}>
                    {step.description}
                  </Text>
                  {isCompleted && (
                    <View testID="step-completed-icon" style={styles.completedBadge}>
                      <CheckCircle size={14} color={theme.successAlt} />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 24,
      paddingTop: 60,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    stepCard: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    stepCardCompleted: {
      borderWidth: 2,
      borderColor: theme.successAlt,
    },
    stepNumber: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    stepNumberCompleted: {
      backgroundColor: theme.successAlt,
    },
    stepNumberText: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.white,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    stepDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
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
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    completedText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.successAlt,
      fontWeight: '600',
    },
  });
