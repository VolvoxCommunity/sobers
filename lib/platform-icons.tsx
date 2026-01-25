// =============================================================================
// Imports
// =============================================================================

import React from 'react';
import { MessageCircle, Send, Phone, Shield } from 'lucide-react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Supported platform keys for external handles.
 */
export type PlatformKey = 'discord' | 'telegram' | 'whatsapp' | 'signal' | 'phone';

/**
 * Theme colors interface for icon rendering.
 */
export interface IconTheme {
  primary: string;
  info: string;
  success: string;
  warning: string;
  textSecondary: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Human-readable labels for platform keys.
 */
export const platformLabels: Record<PlatformKey, string> = {
  discord: 'Discord',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  phone: 'Phone',
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get human-readable label for a platform key.
 */
export function getPlatformLabel(key: string): string {
  return (platformLabels as Record<string, string>)[key] || key;
}

/**
 * Get icon component for a platform.
 *
 * @param key - Platform key (discord, telegram, etc.)
 * @param theme - Theme colors for icon coloring
 * @param size - Icon size (default: 16)
 * @returns React node for the platform icon
 */
export function getPlatformIcon(key: string, theme: IconTheme, size = 16): React.ReactNode {
  switch (key) {
    case 'discord':
      return <MessageCircle size={size} color={theme.primary} />;
    case 'telegram':
      return <Send size={size} color={theme.info} />;
    case 'whatsapp':
    case 'phone':
      return <Phone size={size} color={theme.success} />;
    case 'signal':
      return <Shield size={size} color={theme.warning} />;
    default:
      return <MessageCircle size={size} color={theme.textSecondary} />;
  }
}
