/**
 * Re-export from the new platform-aware alert module.
 *
 * This file exists for backwards compatibility. New code should import from '@/lib/alert'.
 *
 * @deprecated Import from '@/lib/alert' directly instead
 * @module lib/alert
 */

export { showAlert, showConfirm, type AlertButton } from './alert/index';
