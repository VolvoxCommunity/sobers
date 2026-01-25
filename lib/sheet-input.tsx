/**
 * Platform-specific input component for bottom sheets.
 *
 * On web, uses regular TextInput to avoid BottomSheetTextInput compatibility issues.
 * On native, uses BottomSheetTextInput for proper keyboard handling in sheets.
 */

import { Platform, TextInput } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

// Use regular TextInput on web to avoid BottomSheetTextInput compatibility issues
export const SheetInputComponent = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
