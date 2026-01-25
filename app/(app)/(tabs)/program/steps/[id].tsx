// =============================================================================
// Imports
// =============================================================================
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle, Circle, ChevronRight } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StepContent, UserStepProgress } from '@/types/database';
import { logger, LogCategory } from '@/lib/logger';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

// =============================================================================
// Component
// =============================================================================

/**
 * Render a full-screen, scrollable detail view for a single step with navigation and completion controls.
 *
 * Fetches step content and, when a user is signed in, their progress; displays loading and error states,
 * lets the user mark the step complete/uncomplete, and enables navigation to previous/next steps.
 *
 * @returns The step detail screen component element
 */
export default function StepDetailScreen() {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [step, setStep] = useState<StepContent | null>(null);
  const [allSteps, setAllSteps] = useState<StepContent[]>([]);
  const [progress, setProgress] = useState<UserStepProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingCompletion, setTogglingCompletion] = useState(false);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const currentIndex = allSteps.findIndex((s) => s.id === id);
  // Ensure navigation is disabled when step is not found (currentIndex === -1)
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allSteps.length - 1;
  const isCompleted = !!progress;

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const fetchStepData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all steps for navigation
      const { data: stepsData, error: stepsError } = await supabase
        .from('steps_content')
        .select('*')
        .order('step_number');

      // Guard against state updates after unmount
      if (!isMountedRef.current) return;

      if (stepsError) {
        logger.error('Failed to fetch steps', stepsError as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to load step content');
        return;
      }

      setAllSteps(stepsData || []);

      // Find the current step
      const currentStep = stepsData?.find((s) => s.id === id);
      if (!currentStep) {
        setError('Step not found');
        return;
      }

      setStep(currentStep);

      // Track step viewed
      trackEvent(AnalyticsEvents.STEP_VIEWED, { step_number: currentStep.step_number });

      // Fetch progress for this step
      if (profile) {
        const { data: progressData } = await supabase
          .from('user_step_progress')
          .select('*')
          .eq('user_id', profile.id)
          .eq('step_number', currentStep.step_number)
          .maybeSingle();

        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        setProgress(progressData);
      }
    } catch (err) {
      logger.error('Step data fetch exception', err as Error, {
        category: LogCategory.DATABASE,
      });
      // Guard against state updates after unmount
      if (!isMountedRef.current) return;
      setError('An unexpected error occurred');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id, profile]);

  useEffect(() => {
    fetchStepData();
  }, [fetchStepData]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleBack = () => {
    router.back();
  };

  const handlePreviousStep = () => {
    if (hasPrevious) {
      const prevStep = allSteps[currentIndex - 1];
      router.push(`/program/steps/${prevStep.id}`);
    }
  };

  const handleNextStep = () => {
    if (hasNext) {
      const nextStep = allSteps[currentIndex + 1];
      router.push(`/program/steps/${nextStep.id}`);
    }
  };

  const handleToggleCompletion = async () => {
    if (!profile || !step || togglingCompletion) return;

    setTogglingCompletion(true);
    try {
      if (progress) {
        // Remove completion
        const { error: deleteError } = await supabase
          .from('user_step_progress')
          .delete()
          .eq('id', progress.id);

        if (deleteError) throw deleteError;
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        setProgress(null);
      } else {
        // Mark as complete
        const { data, error: insertError } = await supabase
          .from('user_step_progress')
          .insert({
            user_id: profile.id,
            step_number: step.step_number,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        setProgress(data);
      }
    } catch (err) {
      logger.error('Step completion toggle failed', err as Error, {
        category: LogCategory.DATABASE,
      });
    } finally {
      if (isMountedRef.current) {
        setTogglingCompletion(false);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Memoized Values
  // ---------------------------------------------------------------------------
  const styles = useMemo(
    () => createStyles(theme, insets, tabBarPadding),
    [theme, insets, tabBarPadding]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading step...</Text>
        </View>
      </View>
    );
  }

  if (error || !step) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Step not found'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchStepData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="step-detail-back-button" onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.stepIndicator}>
          Step {step.step_number} of {allSteps.length}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.stepNumber}>Step {step.step_number}</Text>
          <Text testID="step-detail-title" style={styles.title}>
            {step.title}
          </Text>
          <Text style={styles.description}>{step.description}</Text>
        </View>

        {/* Detailed Content Section */}
        <View testID="step-detail-content" style={styles.section}>
          <Text style={styles.sectionTitle}>Understanding This Step</Text>
          <Text style={styles.sectionContent}>{step.detailed_content}</Text>
        </View>

        {/* Reflection Prompts Section */}
        {step.reflection_prompts && step.reflection_prompts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reflection Questions</Text>
            {step.reflection_prompts.map((prompt, index) => (
              <View key={index} style={styles.promptItem}>
                <Text style={styles.promptBullet}>•</Text>
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons - inside scroll content for glass tab bar visibility */}
        <View style={styles.actionSection}>
          {/* Completion Button */}
          <Pressable
            testID="step-detail-complete-button"
            style={[
              styles.completeButton,
              isCompleted && styles.completeButtonActive,
              togglingCompletion && styles.completeButtonDisabled,
            ]}
            onPress={handleToggleCompletion}
            disabled={togglingCompletion}
          >
            {togglingCompletion ? (
              <>
                <ActivityIndicator size="small" color={theme.white} />
                <Text style={styles.completeButtonText}>Updating...</Text>
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle size={20} color={theme.white} />
                <Text style={styles.completeButtonText}>Marked as Complete</Text>
              </>
            ) : (
              <>
                <Circle size={20} color={theme.white} />
                <Text style={styles.completeButtonText}>Mark as Complete</Text>
              </>
            )}
          </Pressable>

          {/* Step Navigation */}
          <View style={styles.navigation}>
            <Pressable
              onPress={handlePreviousStep}
              style={[styles.navButton, !hasPrevious && styles.navButtonDisabled]}
              disabled={!hasPrevious}
            >
              <ChevronLeft size={20} color={hasPrevious ? theme.primary : theme.textSecondary} />
              <Text style={[styles.navButtonText, !hasPrevious && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNextStep}
              style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
              disabled={!hasNext}
            >
              <Text style={[styles.navButtonText, !hasNext && styles.navButtonTextDisabled]}>
                Next
              </Text>
              <ChevronRight size={20} color={hasNext ? theme.primary : theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Bottom padding for tab bar clearance */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors, insets: { top: number }, tabBarPadding: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    stepIndicator: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    headerSpacer: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      textAlign: 'center',
      marginBottom: 16,
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
    },
    titleSection: {
      marginBottom: 24,
    },
    stepNumber: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      lineHeight: 36,
    },
    description: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 28,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    sectionContent: {
      fontSize: 17,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 28,
    },
    promptItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    promptBullet: {
      fontSize: 17,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      marginRight: 12,
      fontWeight: '700',
    },
    promptText: {
      flex: 1,
      fontSize: 17,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 26,
    },
    actionSection: {
      marginTop: 16,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 16,
    },
    bottomPadding: {
      // Account for native tab bar height plus safe area so content isn't hidden
      height: tabBarPadding,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 8,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    navButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.primary,
    },
    navButtonTextDisabled: {
      color: theme.textSecondary,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    completeButtonActive: {
      backgroundColor: theme.successAlt,
    },
    completeButtonDisabled: {
      opacity: 0.7,
    },
    completeButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });
