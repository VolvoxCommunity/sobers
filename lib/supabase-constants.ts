/**
 * @fileoverview Constants for Supabase storage chunking.
 *
 * These constants are extracted to a separate file to allow importing
 * without triggering the main supabase.ts module initialization
 * (which requires environment variables).
 */

// =============================================================================
// Chunked SecureStore Constants
// =============================================================================

/**
 * Maximum chunk size for SecureStore values.
 * iOS SecureStore has a 2048 byte limit. We use 2000 to leave margin for
 * encoding overhead and ensure we stay under the limit.
 */
export const CHUNK_SIZE = 2000;

/**
 * Suffix for the metadata key that stores the chunk count.
 */
export const CHUNK_COUNT_SUFFIX = '_chunk_count';
