/**
 * Fallback alert implementation for unknown platforms.
 *
 * This file provides type information for TypeScript and serves as a
 * fallback for platforms where neither .web.ts nor .native.ts applies.
 * At runtime on web/iOS/Android, Metro loads the appropriate platform file.
 *
 * @module lib/alert/platform
 */

import type { AlertButton } from './types';
import { logger, LogCategory } from '@/lib/logger';

/**
 * Fallback alert implementation that logs a warning.
 *
 * @param title - Dialog title
 * @param message - Optional body text
 * @param _buttons - Optional button configurations (ignored in fallback)
 */
export function showAlertPlatform(title: string, message?: string, _buttons?: AlertButton[]): void {
  logger.warn(`Alert (fallback): ${title}${message ? `: ${message}` : ''}`, {
    category: LogCategory.NAVIGATION,
  });
}

/**
 * Fallback confirm implementation that always returns false.
 *
 * @param title - Dialog title
 * @param message - Dialog message body
 * @param _confirmText - Label for confirm button (ignored in fallback)
 * @param _cancelText - Label for cancel button (ignored in fallback)
 * @param _destructive - Whether confirm button is destructive (ignored in fallback)
 * @returns Always returns false on unsupported platforms
 */
export async function showConfirmPlatform(
  title: string,
  message: string,
  _confirmText?: string,
  _cancelText?: string,
  _destructive?: boolean
): Promise<boolean> {
  logger.warn(`Confirm (fallback): ${title}: ${message}`, {
    category: LogCategory.NAVIGATION,
  });
  return false;
}
