// =============================================================================
// Constants
// =============================================================================

/**
 * External URLs for legal documents and social links.
 */
export const EXTERNAL_LINKS = {
  PRIVACY_POLICY: 'https://www.volvoxdev.com/privacy',
  TERMS_OF_SERVICE: 'https://sobrietywaypoint.com/terms',
  SOURCE_CODE: 'https://github.com/VolvoxCommunity/Sobriety-Waypoint',
  DEVELOPER: 'https://billchirico.dev',
} as const;

/**
 * No-op function to prevent event propagation on inner Pressable.
 * Defined outside component to avoid creating new function on each render.
 */
export const noop = () => {};
