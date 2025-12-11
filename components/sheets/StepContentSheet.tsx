// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetScrollView, TouchableOpacity } from '@gorhom/bottom-sheet';
import { CheckCircle, Circle } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { StepContent, UserStepProgress } from '@/types/database';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the StepContentSheet component.
 */
export interface StepContentSheetProps {
  /**
   * The step content to display in the sheet.
   */
  step: StepContent | null;

  /**
   * User's progress for this step (if completed).
   */
  progress?: UserStepProgress;

  /**
   * Callback fired when the completion button is pressed.
   *
   * @param stepNumber - The step number to toggle completion for
   */
  onToggleCompletion: (stepNumber: number) => void;

  /**
   * Callback fired when the sheet is dismissed.
   *
   * @optional
   */
  onDismiss?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet component for viewing step details in the Steps screen.
 *
 * Features:
 * - Displays step title, description, and detailed content
 * - Shows reflection questions in a bulleted list
 * - Toggle completion button at the bottom
 * - Liquid Glass styling via GlassBottomSheet
 * - Scrollable content area with snap points at 70% and 95%
 *
 * @remarks
 * This component always renders the GlassBottomSheet wrapper, even when `step` is null.
 * This is intentional to ensure the forwarded ref is always connected to the bottom sheet.
 * Without this pattern, the first tap to open the sheet would fail because:
 * 1. Parent state update triggers a re-render
 * 2. Component mounts and connects the ref
 * 3. But `ref.current.present()` was already called before the ref was available
 *
 * This "always render" pattern prevents the "double-tap to open" bug that occurs
 * with conditionally rendered `forwardRef` components.
 *
 * @deprecated This bottom sheet component is being replaced by a dedicated detail screen
 * at `/steps/[id]`. The detail screen provides better navigation, back button support,
 * and integrates with the native navigation stack. This component may be removed in a
 * future release once all step viewing is migrated to the detail screen.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<GlassBottomSheetRef>(null);
 *
 * return (
 *   <>
 *     <Button onPress={() => sheetRef.current?.present()}>View Step</Button>
 *     <StepContentSheet
 *       ref={sheetRef}
 *       step={selectedStep}
 *       progress={progress[selectedStep?.step_number]}
 *       onToggleCompletion={(num) => toggleStepCompletion(num)}
 *       onDismiss={() => setSelectedStep(null)}
 *     />
 *   </>
 * );
 * ```
 */
const StepContentSheet = forwardRef<GlassBottomSheetRef, StepContentSheetProps>(
  ({ step, progress, onToggleCompletion, onDismiss }, ref) => {
    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const { theme } = useTheme();

    // ---------------------------------------------------------------------------
    // Derived State
    // ---------------------------------------------------------------------------
    const isCompleted = !!progress;

    // ---------------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------------
    const styles = createStyles(theme);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    /**
     * Handles the completion toggle button press.
     */
    const handleTogglePress = () => {
      if (step) {
        onToggleCompletion(step.step_number);
      }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    // IMPORTANT: Always render GlassBottomSheet so the ref is always connected.
    // If we return null when step is null, the ref won't be available on first tap,
    // causing a "double-tap to open" bug where the first tap sets state but
    // present() fails because ref.current is null.
    return (
      <GlassBottomSheet ref={ref} snapPoints={['70%', '95%']} onDismiss={onDismiss}>
        {step && (
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.stepNumber}>Step {step.step_number}</Text>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>

            {/* Scrollable Content - Must use BottomSheetScrollView for proper gesture handling */}
            <BottomSheetScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Detailed Content Section */}
              <View style={styles.section}>
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

              {/* Bottom padding for scrolling clearance */}
              <View style={styles.bottomPadding} />
            </BottomSheetScrollView>

            {/* Footer with Completion Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.completeButton, isCompleted && styles.completeButtonActive]}
                onPress={handleTogglePress}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle size={20} color="#ffffff" />
                    <Text style={styles.completeButtonText}>Marked as Complete</Text>
                  </>
                ) : (
                  <>
                    <Circle size={20} color="#ffffff" />
                    <Text style={styles.completeButtonText}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
StepContentSheet.displayName = 'StepContentSheet';

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    stepNumber: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 8,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      lineHeight: 28,
    },
    description: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: 24,
      // flexGrow ensures content can expand and scroll properly
      flexGrow: 1,
    },
    section: {
      marginTop: 24,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    sectionContent: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 26,
    },
    promptItem: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    promptBullet: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      marginRight: 12,
      fontWeight: '700',
    },
    promptText: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    bottomPadding: {
      // Extra padding to ensure content can scroll fully into view
      height: 48,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
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
      backgroundColor: theme.success,
    },
    completeButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: '#ffffff',
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default StepContentSheet;
