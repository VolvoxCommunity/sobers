import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, Phone, Send, Shield, Plus, X } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { ExternalHandles } from '@/types/database';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Known platform keys for external handles.
 */
type PlatformKey = 'discord' | 'telegram' | 'whatsapp' | 'signal' | 'phone';

/**
 * Supported external platforms with their configuration.
 */
interface PlatformConfig {
  key: PlatformKey;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}

/**
 * Props for the ExternalHandlesSection component.
 */
interface ExternalHandlesSectionProps {
  /** Current external handles from profile */
  value: ExternalHandles | undefined;
  /** Callback when handles change */
  onChange: (handles: ExternalHandles) => void;
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Whether changes are being saved (shows indicator, doesn't disable input) */
  isSaving?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * A section for managing external platform handles (Discord, Telegram, etc.).
 * Handles are stored privately and only revealed with mutual consent per-connection.
 *
 * @example
 * ```tsx
 * <ExternalHandlesSection
 *   value={profile.external_handles}
 *   onChange={(handles) => updateProfile({ external_handles: handles })}
 *   theme={theme}
 * />
 * ```
 */
export default function ExternalHandlesSection({
  value = {},
  onChange,
  theme,
  isSaving = false,
}: ExternalHandlesSectionProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(() => {
    // Auto-expand platforms that already have values
    const expanded = new Set<string>();
    Object.entries(value).forEach(([key, val]) => {
      if (val) expanded.add(key);
    });
    return expanded;
  });

  const platforms: PlatformConfig[] = useMemo(
    () => [
      {
        key: 'discord',
        label: 'Discord',
        placeholder: 'username#1234 or @username',
        icon: <MessageCircle size={20} color={theme.primary} />,
      },
      {
        key: 'telegram',
        label: 'Telegram',
        placeholder: '@username',
        icon: <Send size={20} color={theme.info} />,
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: '+1 234 567 8900',
        icon: <Phone size={20} color={theme.success} />,
      },
      {
        key: 'signal',
        label: 'Signal',
        placeholder: '+1 234 567 8900',
        icon: <Shield size={20} color={theme.warning} />,
      },
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+1 234 567 8900',
        icon: <Phone size={20} color={theme.textSecondary} />,
      },
    ],
    [theme]
  );

  const handleChange = (key: PlatformKey, newValue: string) => {
    const updated = { ...value };
    if (newValue.trim()) {
      updated[key] = newValue.trim();
    } else {
      delete updated[key];
    }
    onChange(updated);
  };

  const togglePlatform = (key: PlatformKey) => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Clear the value when collapsing
        handleChange(key, '');
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const visiblePlatforms = platforms.filter((p) => expandedPlatforms.has(p.key));
  const hiddenPlatforms = platforms.filter((p) => !expandedPlatforms.has(p.key));

  return (
    <View style={styles.container} testID="external-handles-section">
      <View style={styles.header}>
        <Text style={styles.title}>External Contacts</Text>
        <View style={styles.headerRight}>
          {isSaving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
          <View style={styles.privacyBadge}>
            <Shield size={12} color={theme.success} />
            <Text style={styles.privacyText}>Private</Text>
          </View>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Store your contact info privately. Only revealed to connections with mutual consent.
      </Text>

      {/* Active platforms */}
      <View style={styles.platformsContainer}>
        {visiblePlatforms.map((platform) => (
          <View key={platform.key} style={styles.platformRow}>
            <View style={styles.platformIcon}>{platform.icon}</View>
            <View style={styles.platformInput}>
              <Text style={styles.platformLabel}>{platform.label}</Text>
              <TextInput
                style={styles.input}
                value={value[platform.key] || ''}
                onChangeText={(text) => handleChange(platform.key, text)}
                placeholder={platform.placeholder}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                testID={`handle-input-${platform.key}`}
              />
            </View>
            <TouchableOpacity
              onPress={() => togglePlatform(platform.key)}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${platform.label}`}
            >
              <X size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Add platform buttons */}
      {hiddenPlatforms.length > 0 && (
        <View style={styles.addSection}>
          <Text style={styles.addLabel}>Add contact method:</Text>
          <View style={styles.addButtonsRow}>
            {hiddenPlatforms.map((platform) => (
              <TouchableOpacity
                key={platform.key}
                style={styles.addButton}
                onPress={() => togglePlatform(platform.key)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${platform.label}`}
              >
                {platform.icon}
                <Text style={styles.addButtonText}>{platform.label}</Text>
                <Plus size={14} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    savingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    savingText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    privacyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.successLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    privacyText: {
      fontSize: 11,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.success,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    platformsContainer: {
      gap: 12,
    },
    platformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    platformIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    platformInput: {
      flex: 1,
      marginLeft: 12,
    },
    platformLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    input: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      padding: 0,
    },
    removeButton: {
      padding: 8,
    },
    addSection: {
      marginTop: 16,
    },
    addLabel: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    addButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },
    addButtonText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
  });
