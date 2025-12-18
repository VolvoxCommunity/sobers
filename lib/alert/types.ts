/**
 * Type definitions for platform alert utilities.
 *
 * @module lib/alert/types
 */

/**
 * Button configuration for native Alert dialogs.
 * Maps to React Native's AlertButton type.
 */
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
