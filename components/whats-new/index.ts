/**
 * @fileoverview Barrel export for whats-new components
 *
 * Re-exports all What's New related components for cleaner imports.
 *
 * @example
 * ```tsx
 * import { WhatsNewSheet, WhatsNewFeatureCard, type WhatsNewSheetRef } from '@/components/whats-new';
 * ```
 */

export { default as WhatsNewSheet, type WhatsNewSheetRef } from './WhatsNewSheet';
export { default as WhatsNewFeatureCard } from './WhatsNewFeatureCard';
