// lib/semver.ts

/**
 * Parses a version string into numeric segments.
 * Returns [Infinity] for malformed versions to sort them to the end.
 */
function parseVersion(version: string): number[] {
  const segments = version.split('.').map((s) => parseInt(s, 10));
  if (segments.some(isNaN)) {
    return [Infinity]; // Malformed versions sort to end
  }
  return segments;
}

/**
 * Compares two semantic version strings.
 *
 * @param a - First version string (e.g., "1.2.3")
 * @param b - Second version string (e.g., "1.2.4")
 * @returns Negative if a < b, positive if a > b, zero if equal
 *
 * @example
 * compareSemver('1.0.0', '2.0.0') // returns -1
 * compareSemver('2.0.0', '1.0.0') // returns 1
 * compareSemver('1.0.0', '1.0.0') // returns 0
 */
export function compareSemver(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  return 0;
}

/**
 * Sorts an array of version strings in descending order (newest first).
 *
 * @param versions - Array of version strings
 * @returns New array sorted by version descending
 *
 * @example
 * sortByVersion(['1.0.0', '2.0.0', '1.5.0'])
 * // returns ['2.0.0', '1.5.0', '1.0.0']
 */
export function sortByVersion<T extends string>(versions: T[]): T[] {
  return [...versions].sort((a, b) => compareSemver(b, a));
}
