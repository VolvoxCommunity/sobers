// =============================================================================
// Imports
// =============================================================================
import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/contexts/ThemeContext';
import { X, Calendar, Heart } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logger, LogCategory } from '@/lib/logger';
import { formatDateWithTimezone, parseDateAsLocal, getUserTimezone } from '@/lib/date';
import { showAlert, showConfirm } from '@/lib/alert';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import type { Profile } from '@/types/database';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by LogSlipUpSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<LogSlipUpSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface LogSlipUpSheetRef {
  /**
   * Presents the slip-up logging sheet.
   */
  present: () => void;

  /**
   * Dismisses the slip-up logging sheet.
   */
  dismiss: () => void;
}

interface LogSlipUpSheetProps {
  /**
   * User profile containing timezone and other user data.
   */
  profile: Profile;

  /**
   * Theme colors used to style the sheet.
   */
  theme: ThemeColors;

  /**
   * Callback invoked when the sheet is dismissed without logging.
   */
  onClose: () => void;

  /**
   * Callback invoked after a slip-up is successfully logged.
   */
  onSlipUpLogged: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet UI for logging slip-ups with date picker and optional notes.
 *
 * Features:
 * - Date picker for slip-up date (must be in the past)
 * - Optional notes field for context
 * - Liquid Glass styling via GlassBottomSheet
 * - Saves to Supabase slip_ups table
 * - Notifies sponsors of the slip-up
 *
 * @param profile - User profile containing timezone for date handling
 * @param theme - Theme colors used to style the sheet
 * @param onClose - Callback invoked when the sheet is dismissed without logging
 * @param onSlipUpLogged - Callback invoked after a slip-up is successfully logged
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<LogSlipUpSheetRef>(null);
 *
 * // Open the sheet
 * sheetRef.current?.present();
 *
 * <LogSlipUpSheet
 *   ref={sheetRef}
 *   profile={profile}
 *   theme={theme}
 *   onClose={() => {}}
 *   onSlipUpLogged={handleSlipUpLogged}
 * />
 * ```
 */
const LogSlipUpSheet = forwardRef<LogSlipUpSheetRef, LogSlipUpSheetProps>(
  ({ profile, theme, onClose, onSlipUpLogged }, ref) => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [slipUpDate, setSlipUpDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const isMountedRef = useRef(true);

    // Track mounted state to prevent state updates after unmount
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // User's timezone (stored in profile) with device timezone as fallback
    const userTimezone = getUserTimezone(profile);

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      present: () => {
        // Reset form when presenting
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const resetForm = useCallback(() => {
      setSlipUpDate(new Date());
      setNotes('');
      setError('');
      setShowDatePicker(false);
    }, []);

    /**
     * Handler for GlassBottomSheet's onDismiss callback.
     * Performs cleanup and notifies parent - called when sheet finishes dismissing.
     */
    const handleDismiss = useCallback(() => {
      resetForm();
      onClose();
    }, [resetForm, onClose]);

    /**
     * Handler for button press events (close icon, cancel button).
     * Only triggers the dismiss animation - cleanup happens in handleDismiss.
     */
    const handlePressClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    /**
     * Submits a slip-up record with timezone-aware date formatting.
     * Uses the user's stored timezone if available, otherwise falls back to device timezone.
     */
    const handleSubmit = useCallback(async () => {
      setError('');

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (slipUpDate > today) {
        setError('Slip-up date cannot be in the future');
        return;
      }

      const confirmed = await showConfirm(
        'Ready to Record?',
        'Recording this will restart your journey counter. Your sponsor will be notified so they can support you. Ready to continue?',
        'Yes, Continue',
        'Not Yet',
        false
      );

      if (!confirmed) return;

      setIsSubmitting(true);

      try {
        // Insert slip-up record
        // Note: recovery_restart_date is intentionally set to the same value as slip_up_date
        // because the user's recovery journey restarts from the slip-up date
        const { error: slipUpError } = await supabase.from('slip_ups').insert({
          user_id: profile.id,
          slip_up_date: formatDateWithTimezone(slipUpDate, userTimezone),
          recovery_restart_date: formatDateWithTimezone(slipUpDate, userTimezone),
          notes: notes.trim() || null,
        });

        if (slipUpError) throw slipUpError;

        // Guard against state updates after unmount
        if (!isMountedRef.current) return;

        // Fetch sponsors to notify
        const { data: sponsors } = await supabase
          .from('sponsor_sponsee_relationships')
          .select('sponsor_id')
          .eq('sponsee_id', profile.id)
          .eq('status', 'active');

        // Create notifications for all active sponsors (non-blocking - slip-up logging succeeds even if notification fails)
        if (sponsors && sponsors.length > 0) {
          const notifications = sponsors.map((rel) => ({
            user_id: rel.sponsor_id,
            type: 'milestone',
            title: 'Sponsee Slip Up',
            content: `${profile.display_name ?? 'Unknown'} has logged a slip-up and restarted their recovery journey.`,
            data: {
              sponsee_id: profile.id,
              slip_up_date: slipUpDate.toISOString(),
            },
          }));

          const { error: notifyError } = await supabase.from('notifications').insert(notifications);

          if (notifyError) {
            // Log notification failure but don't fail the slip-up logging
            logger.warn('Failed to send sponsor notifications for slip-up', {
              category: LogCategory.DATABASE,
              error: notifyError.message,
              sponsorCount: sponsors.length,
            });
          }
        }

        // Guard against state updates after unmount
        if (!isMountedRef.current) return;

        // Success - notify parent and close
        onSlipUpLogged();
        handlePressClose();

        // Show success message
        showAlert(
          'Setback Recorded',
          "Your setback has been recorded. This took real courage. Remember: every day is a fresh start, and you're not alone on this journey."
        );
      } catch (err) {
        logger.error('Slip-up logging failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        setError('Failed to log slip-up. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    }, [slipUpDate, notes, profile, userTimezone, onSlipUpLogged, handlePressClose]);

    const styles = createStyles(theme);

    // ---------------------------------------------------------------------------
    // Footer Component
    // ---------------------------------------------------------------------------
    /**
     * Renders the footer with the submit button.
     * Using BottomSheetFooter ensures the button is always visible at the bottom.
     * Users can dismiss via backdrop tap, swipe down, or the X button.
     */
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.submitButtonText}>Record & Restart</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetFooter>
      ),
      [styles, handleSubmit, isSubmitting, theme.white]
    );

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['60%', '90%']}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        footerComponent={renderFooter}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Heart size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>Record a Setback</Text>
          <TouchableOpacity
            onPress={handlePressClose}
            style={styles.closeButton}
            testID="close-icon-button"
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <Text style={styles.subtitle}>
            Recovery includes setbacks — they&apos;re part of the journey, not the end of it.
            Recording this honestly takes courage, and we&apos;re here to support you.
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>When did this happen?</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formatDateWithTimezone(slipUpDate, userTimezone)}
                max={formatDateWithTimezone(new Date(), userTimezone)}
                onChange={(e) => setSlipUpDate(parseDateAsLocal(e.target.value, userTimezone))}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.background,
                  color: theme.text,
                  width: '100%',
                }}
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={20} color={theme.textSecondary} />
                  <Text style={styles.dateButtonText}>
                    {slipUpDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={slipUpDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      // Native dialog auto-closes on both OK and Cancel press.
                      // We always hide the picker to sync React state with native UI.
                      // When date is defined (OK pressed), update it before hiding.
                      if (date) {
                        setSlipUpDate(date);
                      }
                      setShowDatePicker(false);
                    }}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <BottomSheetTextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What happened? How are you feeling?"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.privacyNote}>
            This information will be visible to you and your sponsor.
          </Text>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
LogSlipUpSheet.displayName = 'LogSlipUpSheet';

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 24,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 20,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    dateButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    notesInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      minHeight: 100,
    },
    privacyNote: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    submitButton: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default LogSlipUpSheet;
