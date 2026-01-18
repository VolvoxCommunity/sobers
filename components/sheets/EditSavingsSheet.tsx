// =============================================================================
// Imports
// =============================================================================
import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SheetInputComponent } from '@/lib/sheet-input';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { X, DollarSign } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { showConfirm } from '@/lib/alert';
import { showToast } from '@/lib/toast';
import { logger, LogCategory } from '@/lib/logger';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { trackEvent } from '@/lib/analytics';
import { AnalyticsEvents } from '@/types/analytics';
import type { Profile } from '@/types/database';
import type { SpendingFrequency } from '@/lib/savings';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by EditSavingsSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EditSavingsSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface EditSavingsSheetRef {
  /**
   * Presents the savings editing sheet.
   */
  present: () => void;

  /**
   * Dismisses the savings editing sheet.
   */
  dismiss: () => void;
}

/**
 * Props for the EditSavingsSheet component.
 */
interface EditSavingsSheetProps {
  /**
   * Current user profile containing spending data.
   */
  profile: Profile;

  /**
   * Callback invoked when the sheet is dismissed.
   */
  onClose: () => void;

  /**
   * Callback invoked after successful save or clear operation.
   * Supports async callbacks to ensure data is refreshed before sheet dismissal.
   */
  onSave: () => void | Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Available frequency options for spending.
 */
const FREQUENCIES: { value: SpendingFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet for editing savings tracking settings.
 *
 * Allows users to update their spending amount/frequency or clear tracking data entirely.
 * Features pre-fill with current profile values, validation, and confirmation dialogs.
 *
 * @param profile - Current user profile
 * @param onClose - Callback when sheet is closed
 * @param onSave - Callback after successful save
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EditSavingsSheetRef>(null);
 *
 * <EditSavingsSheet
 *   ref={sheetRef}
 *   profile={profile}
 *   onClose={() => {}}
 *   onSave={refreshProfile}
 * />
 *
 * // Open the sheet
 * sheetRef.current?.present();
 * ```
 */
const EditSavingsSheet = forwardRef<EditSavingsSheetRef, EditSavingsSheetProps>(
  ({ profile, onClose, onSave }, ref) => {
    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const { theme } = useTheme();
    const sheetRef = useRef<GlassBottomSheetRef>(null);

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [amount, setAmount] = useState(profile.spend_amount?.toString() ?? '');
    const [frequency, setFrequency] = useState<SpendingFrequency>(
      profile.spend_frequency ?? 'weekly'
    );
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Determine if this is first-time setup (no existing spend data)
    const isSetupMode = profile.spend_amount == null || profile.spend_frequency == null;

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      present: () => {
        // Reset to current values when presenting
        setAmount(profile.spend_amount?.toString() ?? '');
        setFrequency(profile.spend_frequency ?? 'weekly');
        setError('');
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------
    /**
     * Validates the amount input value.
     *
     * @param value - The amount string to validate
     * @returns True if valid, false otherwise (sets error state on failure)
     */
    const validateAmount = useCallback((value: string): boolean => {
      if (!value.trim()) {
        setError('Amount is required');
        return false;
      }
      const num = parseFloat(value);
      if (isNaN(num)) {
        setError('Please enter a valid number');
        return false;
      }
      if (num < 0) {
        setError('Amount cannot be negative');
        return false;
      }
      setError('');
      return true;
    }, []);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    /**
     * Handles saving the updated spending values to the database.
     * Awaits onSave callback to ensure profile data is refreshed before sheet dismissal.
     */
    const handleSave = useCallback(async () => {
      if (!validateAmount(amount)) return;

      setIsSaving(true);
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            spend_amount: parseFloat(amount),
            spend_frequency: frequency,
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        trackEvent(AnalyticsEvents.SAVINGS_UPDATED, {
          amount: parseFloat(amount),
          frequency,
          is_first_setup: isSetupMode,
        });

        showToast.success('Savings tracking updated');
        await onSave();
        sheetRef.current?.dismiss();
      } catch (err) {
        logger.error('Failed to update savings tracking', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }, [amount, frequency, profile.id, validateAmount, onSave, isSetupMode]);

    /**
     * Handles clearing all spending data after confirmation.
     * Awaits onSave callback to ensure profile data is refreshed before sheet dismissal.
     */
    const handleClear = useCallback(async () => {
      const confirmed = await showConfirm(
        'Clear Tracking Data?',
        'This will reset your spending data. The Money Saved card will show a setup prompt until you configure it again.',
        'Clear Data',
        'Cancel',
        true
      );

      if (!confirmed) return;

      setIsClearing(true);
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            spend_amount: null,
            spend_frequency: null,
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        showToast.success('Tracking data cleared');
        await onSave();
        sheetRef.current?.dismiss();
      } catch (err) {
        logger.error('Failed to clear savings tracking', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to clear. Please try again.');
      } finally {
        setIsClearing(false);
      }
    }, [profile.id, onSave]);

    /**
     * Handles sheet dismissal - resets error and notifies parent.
     */
    const handleDismiss = useCallback(() => {
      setError('');
      onClose();
    }, [onClose]);

    // ---------------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------------
    const styles = useMemo(() => createStyles(theme), [theme]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['50%']}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>
            {isSetupMode ? 'Set Up Savings Tracking' : 'Edit Savings Tracking'}
          </Text>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <DollarSign size={20} color={theme.textSecondary} style={styles.dollarIcon} />
              <SheetInputComponent
                testID="edit-savings-amount-input"
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                accessibilityLabel="Spending amount"
              />
            </View>
          </View>

          {/* Frequency Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyContainer}>
              {FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  testID={`edit-frequency-${freq.value}`}
                  style={[
                    styles.frequencyButton,
                    frequency === freq.value && styles.frequencyButtonSelected,
                  ]}
                  onPress={() => setFrequency(freq.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: frequency === freq.value }}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === freq.value && styles.frequencyTextSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Save Button */}
          <TouchableOpacity
            testID="edit-savings-save-button"
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving || isClearing}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isSetupMode ? 'Get Started' : 'Save Changes'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Clear Button - only shown when editing, not during setup */}
          {!isSetupMode && (
            <TouchableOpacity
              testID="edit-savings-clear-button"
              style={styles.clearButton}
              onPress={handleClear}
              disabled={isSaving || isClearing}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color={theme.danger} />
              ) : (
                <Text style={styles.clearButtonText}>Clear Tracking Data</Text>
              )}
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
EditSavingsSheet.displayName = 'EditSavingsSheet';

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the EditSavingsSheet based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
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
    headerSpacer: {
      width: 24,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    dollarIcon: {
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      padding: 16,
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    frequencyContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    frequencyButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    frequencyButtonSelected: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    frequencyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    frequencyTextSelected: {
      color: theme.primary,
      fontWeight: '600',
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
    saveButton: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      marginBottom: 16,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    clearButton: {
      padding: 16,
      alignItems: 'center',
    },
    clearButtonText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default EditSavingsSheet;
