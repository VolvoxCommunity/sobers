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
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ThemeColors } from '@/contexts/ThemeContext';
import { X, QrCode } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by EnterInviteCodeSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EnterInviteCodeSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface EnterInviteCodeSheetRef {
  /**
   * Presents the invite code entry sheet.
   */
  present: () => void;

  /**
   * Dismisses the invite code entry sheet.
   */
  dismiss: () => void;
}

/**
 * Props for the EnterInviteCodeSheet component.
 */
export interface EnterInviteCodeSheetProps {
  /**
   * Theme colors used to style the sheet.
   */
  theme: ThemeColors;

  /**
   * Callback invoked when the user submits a valid invite code.
   * Receives the 8-character invite code.
   *
   * @param inviteCode - The invite code entered by the user
   */
  onSubmit: (inviteCode: string) => Promise<void>;

  /**
   * Callback invoked when the sheet is dismissed without submitting.
   *
   * @optional
   */
  onClose?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet UI for entering a sponsor invite code.
 *
 * Features:
 * - Text input with 8-character limit and auto-capitalization
 * - Interactive keyboard behavior for smooth scrolling
 * - Loading state during submission
 * - Liquid Glass styling via GlassBottomSheet
 *
 * @param theme - Theme colors used to style the sheet
 * @param onSubmit - Callback invoked when the user submits the invite code
 * @param onClose - Optional callback invoked when the sheet is dismissed
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<EnterInviteCodeSheetRef>(null);
 *
 * <EnterInviteCodeSheet
 *   ref={sheetRef}
 *   theme={theme}
 *   onSubmit={async (code) => {
 *     await connectToSponsor(code);
 *   }}
 *   onClose={() => {}}
 * />
 * ```
 */
const EnterInviteCodeSheet = forwardRef<EnterInviteCodeSheetRef, EnterInviteCodeSheetProps>(
  ({ theme, onSubmit, onClose }, ref) => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [inviteCode, setInviteCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const isMountedRef = useRef(true);
    const didSubmitSuccessfullyRef = useRef(false);

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
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const resetForm = useCallback(() => {
      setInviteCode('');
      setError(null);
      setIsSubmitting(false);
      didSubmitSuccessfullyRef.current = false;
    }, []);

    /**
     * Handler for GlassBottomSheet's onDismiss callback.
     * Performs cleanup and notifies parent only if dismissed without submitting.
     */
    const handleDismiss = useCallback(() => {
      const wasSuccessfulSubmission = didSubmitSuccessfullyRef.current;
      resetForm();
      // Only call onClose if dismissed without successful submission
      if (!wasSuccessfulSubmission) {
        onClose?.();
      }
    }, [resetForm, onClose]);

    /**
     * Handler for close button press.
     */
    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleChangeText = useCallback((text: string) => {
      // Only allow alphanumeric characters and auto-capitalize
      const sanitized = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      setInviteCode(sanitized);
      setError(null);
    }, []);

    const handleSubmit = useCallback(async () => {
      // Guard: Prevent multiple simultaneous submits
      if (isSubmitting) {
        return;
      }

      // Validate input
      if (inviteCode.length !== 8) {
        setError('Please enter an 8-character invite code');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(inviteCode);
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        // Mark as successful submission before dismissing
        // This prevents onClose from being called (per documented contract)
        didSubmitSuccessfullyRef.current = true;
        // Dismiss sheet on success
        sheetRef.current?.dismiss();
      } catch (err: unknown) {
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    }, [inviteCode, isSubmitting, onSubmit]);

    const styles = createStyles(theme);

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
          <View style={styles.headerIcon}>
            <QrCode size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>Enter Invite Code</Text>
          <TouchableOpacity
            onPress={handleClose}
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
            Enter the 8-character invite code from your sponsor to connect with them.
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Invite Code</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={handleChangeText}
              placeholder="Enter 8-character code"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              editable={!isSubmitting}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
              testID="invite-code-input"
              accessibilityLabel="Invite code input"
            />
            <Text style={styles.characterCount}>{inviteCode.length}/8 characters</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || inviteCode.length !== 8) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || inviteCode.length !== 8}
              testID="connect-button"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.submitButtonText}>Connect</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
              testID="cancel-button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
EnterInviteCodeSheet.displayName = 'EnterInviteCodeSheet';

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the EnterInviteCodeSheet based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
    },
    headerIcon: {
      marginRight: 12,
    },
    title: {
      flex: 1,
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
    scrollViewContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: 24,
    },
    label: {
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
      padding: 16,
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.text,
      textAlign: 'center',
      letterSpacing: 4,
    },
    characterCount: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 8,
      textAlign: 'right',
    },
    footer: {
      gap: 12,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    cancelButton: {
      padding: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default EnterInviteCodeSheet;
