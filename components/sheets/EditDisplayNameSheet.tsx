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
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ThemeColors } from '@/contexts/ThemeContext';
import { X } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { validateDisplayName } from '@/lib/validation';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by EditDisplayNameSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EditDisplayNameSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface EditDisplayNameSheetRef {
  /**
   * Presents the display name editing sheet.
   */
  present: () => void;

  /**
   * Dismisses the display name editing sheet.
   */
  dismiss: () => void;
}

/**
 * Props for the EditDisplayNameSheet component.
 */
export interface EditDisplayNameSheetProps {
  /**
   * Current display name to be edited.
   */
  currentDisplayName: string;

  /**
   * Theme colors used to style the sheet.
   */
  theme: ThemeColors;

  /**
   * Callback invoked when the user saves the new display name.
   * Receives the validated, trimmed display name.
   *
   * @param newDisplayName - The new display name to save
   */
  onSave: (newDisplayName: string) => Promise<void>;

  /**
   * Callback invoked when the sheet is dismissed without saving.
   *
   * @optional
   */
  onClose?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet UI for editing user display name with validation and save/cancel actions.
 *
 * Features:
 * - Text input with real-time character count
 * - Client-side validation with error messages
 * - Keyboard-aware with automatic focus
 * - Loading state during save
 * - Cancel confirmation if changes are unsaved
 * - Liquid Glass styling via GlassBottomSheet
 *
 * @param currentDisplayName - Current display name to be edited
 * @param theme - Theme colors used to style the sheet
 * @param onSave - Callback invoked when the user saves the new display name
 * @param onClose - Optional callback invoked when the sheet is dismissed without saving
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EditDisplayNameSheetRef>(null);
 *
 * // Open the sheet
 * sheetRef.current?.present();
 *
 * <EditDisplayNameSheet
 *   ref={sheetRef}
 *   currentDisplayName={profile.display_name}
 *   theme={theme}
 *   onSave={async (newName) => {
 *     await updateProfileName(newName);
 *   }}
 *   onClose={() => {}}
 * />
 * ```
 */
const EditDisplayNameSheet = forwardRef<EditDisplayNameSheetRef, EditDisplayNameSheetProps>(
  ({ currentDisplayName, theme, onSave, onClose }, ref) => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [displayName, setDisplayName] = useState(currentDisplayName);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const isMountedRef = useRef(true);

    // Track mounted state to prevent state updates after unmount
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

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
      setDisplayName(currentDisplayName);
      setValidationError(null);
      setIsSaving(false);
    }, [currentDisplayName]);

    /**
     * Handler for GlassBottomSheet's onDismiss callback.
     * Performs cleanup and notifies parent - called when sheet finishes dismissing.
     */
    const handleDismiss = useCallback(() => {
      resetForm();
      onClose?.();
    }, [resetForm, onClose]);

    /**
     * Handler for button press events (close icon, cancel button).
     * Handles unsaved changes confirmation before dismissing.
     * Only triggers the dismiss animation - cleanup happens in handleDismiss.
     */
    const handleClose = useCallback(() => {
      const hasChanges = displayName.trim() !== currentDisplayName.trim();

      if (hasChanges && !isSaving) {
        if (Platform.OS === 'web') {
          const confirmed = window.confirm(
            'You have unsaved changes. Are you sure you want to close?'
          );
          if (!confirmed) return;
        } else {
          Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                sheetRef.current?.dismiss();
              },
            },
          ]);
          return;
        }
      }

      sheetRef.current?.dismiss();
    }, [displayName, currentDisplayName, isSaving]);

    const handleChangeText = useCallback((text: string) => {
      setDisplayName(text);
      setValidationError(null);
    }, []);

    const handleSave = useCallback(async () => {
      // Guard: Prevent multiple simultaneous saves
      if (isSaving) {
        return;
      }

      // Validate input
      const error = validateDisplayName(displayName);
      if (error) {
        setValidationError(error);
        return;
      }

      const trimmedName = displayName.trim();

      // Guard: No changes - just dismiss (cleanup happens in handleDismiss)
      if (trimmedName === currentDisplayName.trim()) {
        sheetRef.current?.dismiss();
        return;
      }

      setIsSaving(true);
      try {
        await onSave(trimmedName);
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        // Dismiss sheet - cleanup happens in handleDismiss
        sheetRef.current?.dismiss();
      } catch (error: unknown) {
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        // Error handling is delegated to onSave callback
        // This allows parent component to show appropriate error messages
        setValidationError(
          error instanceof Error ? error.message : 'Failed to update display name'
        );
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
      }
    }, [displayName, currentDisplayName, isSaving, onSave]);

    const styles = useMemo(() => createStyles(theme), [theme]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <GlassBottomSheet ref={sheetRef} snapPoints={['40%']} onDismiss={handleDismiss}>
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Display Name</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
            >
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              testID="display-name-input"
              style={styles.input}
              value={displayName}
              onChangeText={handleChangeText}
              placeholder="How you'll appear to others"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              maxLength={30}
              editable={!isSaving}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text
              style={[
                styles.characterCount,
                displayName.length >= 25 && styles.characterCountWarning,
              ]}
            >
              {displayName.length}/30 characters
            </Text>
          </View>

          {/* Validation Error */}
          {validationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              testID="cancel-button"
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="save-button"
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save display name"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
EditDisplayNameSheet.displayName = 'EditDisplayNameSheet';

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the EditDisplayNameSheet based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    inputSection: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    characterCount: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 6,
      textAlign: 'right',
    },
    characterCountWarning: {
      color: theme.warning,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    saveButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default EditDisplayNameSheet;
