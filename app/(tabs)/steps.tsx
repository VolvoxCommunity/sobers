import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StepContent, UserStepProgress } from '@/types/database';
import { CheckCircle } from 'lucide-react-native';
import { logger, LogCategory } from '@/lib/logger';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import StepContentSheet from '@/components/sheets/StepContentSheet';
import { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

/**
 * Screen that displays the 12 steps, the current user's completion progress, and a bottom sheet with step details and reflection prompts.
 *
 * Fetches steps content and the user's progress from the database, shows loading/error/empty states, lets the user open a step to view detailed content and reflection questions, and toggle completion for a step.
 *
 * @returns The component's rendered React element for the Steps screen.
 */
export default function StepsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [steps, setSteps] = useState<StepContent[]>([]);
  const [progress, setProgress] = useState<Record<number, UserStepProgress>>({});
  const [selectedStep, setSelectedStep] = useState<StepContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<GlassBottomSheetRef>(null);

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

  useEffect(() => {
    fetchSteps();
    fetchProgress();
  }, [fetchProgress]);

  /**
   * Handler for when a step is selected/viewed.
   * Tracks analytics and opens the step detail bottom sheet.
   *
   * @param step - The step that was selected
   */
  const handleStepPress = (step: StepContent) => {
    setSelectedStep(step);
    sheetRef.current?.present();
    // Track step viewed event
    trackEvent(AnalyticsEvents.STEP_VIEWED, { step_number: step.step_number });
  };

  /**
   * Handler for when the bottom sheet is dismissed.
   */
  const handleSheetDismiss = () => {
    setSelectedStep(null);
  };

  const toggleStepCompletion = async (stepNumber: number) => {
    if (!profile) return;

    const existingProgress = progress[stepNumber];

    try {
      if (existingProgress) {
        const { error: deleteError } = await supabase
          .from('user_step_progress')
          .delete()
          .eq('id', existingProgress.id);

        if (deleteError) throw deleteError;

        const newProgress = { ...progress };
        delete newProgress[stepNumber];
        setProgress(newProgress);
      } else {
        const { data, error: insertError } = await supabase
          .from('user_step_progress')
          .insert({
            user_id: profile.id,
            step_number: stepNumber,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setProgress({ ...progress, [stepNumber]: data });
      }
    } catch (err) {
      logger.error('Step completion toggle failed', err as Error, {
        category: LogCategory.DATABASE,
      });
    }
  };

  const styles = createStyles(theme);

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>The 12 Steps</Text>
          <Text style={styles.headerSubtitle}>Your path to recovery</Text>
        </View>

        <ScrollView style={styles.content}>
          {loading && (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading steps...</Text>
            </View>
          )}
          {error && (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchSteps}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
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
                <TouchableOpacity
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
                      <View style={styles.completedBadge}>
                        <CheckCircle size={14} color="#10b981" />
                        <Text style={styles.completedText}>Completed</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <StepContentSheet
          ref={sheetRef}
          step={selectedStep}
          progress={selectedStep ? progress[selectedStep.step_number] : undefined}
          onToggleCompletion={toggleStepCompletion}
          onDismiss={handleSheetDismiss}
        />
      </View>
    </BottomSheetModalProvider>
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    stepCardCompleted: {
      borderWidth: 2,
      borderColor: '#10b981',
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
      backgroundColor: '#10b981',
    },
    stepNumberText: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: '#ffffff',
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
      color: '#ef4444',
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
      color: '#ffffff',
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
      color: '#10b981',
      fontWeight: '600',
    },
  });
