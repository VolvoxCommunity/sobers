// =============================================================================
// Imports
// =============================================================================
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { logger, LogCategory } from '@/lib/logger';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Status of the update check/download process.
 */
export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';

/**
 * Result object returned by the useAppUpdates hook.
 */
export interface AppUpdatesResult {
  /** Current status of the update process */
  status: UpdateStatus;
  /** Whether an update check is in progress */
  isChecking: boolean;
  /** Whether an update is being downloaded */
  isDownloading: boolean;
  /** Error message if update failed */
  errorMessage: string | null;
  /** Check for available updates and download if found */
  checkForUpdates: () => Promise<void>;
  /** Reload the app to apply downloaded update */
  applyUpdate: () => Promise<void>;
  /** Whether OTA updates are supported on current platform */
  isSupported: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Custom hook for managing over-the-air (OTA) app updates via Expo Updates.
 *
 * Provides functionality to check for updates, download them, and reload
 * the app to apply them. Only works on native platforms (iOS/Android) in
 * production builds - returns unsupported status for web and development.
 *
 * @returns Object containing update status, loading states, and control functions
 *
 * @example
 * ```tsx
 * const { status, isChecking, checkForUpdates, applyUpdate, isSupported } = useAppUpdates();
 *
 * if (!isSupported) {
 *   return <Text>Updates not available on this platform</Text>;
 * }
 *
 * return (
 *   <View>
 *     <Button onPress={checkForUpdates} disabled={isChecking}>
 *       {isChecking ? 'Checking...' : 'Check for Updates'}
 *     </Button>
 *     {status === 'ready' && (
 *       <Button onPress={applyUpdate}>Restart to Update</Button>
 *     )}
 *   </View>
 * );
 * ```
 */
export function useAppUpdates(): AppUpdatesResult {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTA updates only work on native platforms in production builds
  // In development, expo-updates is not active
  const isSupported = Platform.OS !== 'web' && !__DEV__;

  /**
   * Checks for available updates and downloads them if found.
   * Updates the status throughout the process to reflect current state.
   */
  const checkForUpdates = useCallback(async () => {
    if (!isSupported) {
      setStatus('error');
      setErrorMessage('Updates are not available on this platform');
      return;
    }

    setStatus('checking');
    setErrorMessage(null);

    try {
      logger.info('Checking for app updates', { category: LogCategory.UI });

      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        logger.info('App is up to date', { category: LogCategory.UI });
        setStatus('up-to-date');
        return;
      }

      logger.info('Update available, downloading', { category: LogCategory.UI });
      setStatus('downloading');

      await Updates.fetchUpdateAsync();

      logger.info('Update downloaded and ready to apply', { category: LogCategory.UI });
      setStatus('ready');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error checking for updates');
      logger.error('Failed to check for updates', err, { category: LogCategory.UI });
      setStatus('error');
      setErrorMessage(err.message);
    }
  }, [isSupported]);

  /**
   * Reloads the app to apply a downloaded update.
   * Should only be called when status is 'ready'.
   */
  const applyUpdate = useCallback(async () => {
    if (status !== 'ready') {
      logger.warn('Attempted to apply update when not ready', {
        category: LogCategory.UI,
        currentStatus: status,
      });
      return;
    }

    try {
      logger.info('Reloading app to apply update', { category: LogCategory.UI });
      await Updates.reloadAsync();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to reload app');
      logger.error('Failed to apply update', err, { category: LogCategory.UI });
      setStatus('error');
      setErrorMessage(err.message);
    }
  }, [status]);

  return {
    status,
    isChecking: status === 'checking',
    isDownloading: status === 'downloading',
    errorMessage,
    checkForUpdates,
    applyUpdate,
    isSupported,
  };
}
