// __tests__/lib/semver.test.ts
import { compareSemver, sortByVersion } from '@/lib/semver';

describe('semver utilities', () => {
  describe('compareSemver', () => {
    it('returns negative when a < b', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('returns positive when a > b', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });

    it('returns zero when versions are equal', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('2.5.3', '2.5.3')).toBe(0);
    });

    it('handles versions with different segment counts', () => {
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('1', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', '1')).toBe(0);
    });

    it('handles double-digit version numbers correctly', () => {
      expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
      expect(compareSemver('1.2.10', '1.2.9')).toBeGreaterThan(0);
      expect(compareSemver('10.0.0', '9.0.0')).toBeGreaterThan(0);
    });

    it('handles malformed versions gracefully', () => {
      // Malformed versions should sort to end (return positive for malformed 'a')
      expect(compareSemver('invalid', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', 'invalid')).toBeLessThan(0);
      expect(compareSemver('invalid', 'invalid')).toBe(0);
    });

    it('treats versions with v prefix as malformed', () => {
      // v prefix is not handled, treated as malformed
      expect(compareSemver('v1.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', 'v2.0.0')).toBeLessThan(0);
    });

    it('ignores pre-release suffixes (parseInt behavior)', () => {
      // parseInt('0-beta') returns 0, so suffix is ignored
      // This means '1.0.0-beta' equals '1.0.0'
      expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', '1.0.0-alpha')).toBe(0);
    });

    it('handles empty string as malformed', () => {
      expect(compareSemver('', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '')).toBeLessThan(0);
    });

    it('handles very large version numbers', () => {
      expect(compareSemver('100.200.300', '99.999.999')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '100.0.0')).toBeLessThan(0);
    });

    it('handles zero versions correctly', () => {
      expect(compareSemver('0.0.0', '0.0.1')).toBeLessThan(0);
      expect(compareSemver('0.0.1', '0.0.0')).toBeGreaterThan(0);
      expect(compareSemver('0.0.0', '0.0.0')).toBe(0);
    });
  });

  describe('sortByVersion', () => {
    it('sorts versions in descending order (newest first)', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0', '1.0.1'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0.0', '1.5.0', '1.0.1', '1.0.0']);
    });

    it('handles complex version ordering', () => {
      const versions = ['1.9.0', '1.10.0', '2.0.0', '1.2.0'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0.0', '1.10.0', '1.9.0', '1.2.0']);
    });

    it('returns empty array for empty input', () => {
      expect(sortByVersion([])).toEqual([]);
    });

    it('handles single version', () => {
      expect(sortByVersion(['1.0.0'])).toEqual(['1.0.0']);
    });

    it('handles already sorted input', () => {
      const versions = ['3.0.0', '2.0.0', '1.0.0'];
      expect(sortByVersion(versions)).toEqual(['3.0.0', '2.0.0', '1.0.0']);
    });

    it('handles duplicate versions', () => {
      const versions = ['1.0.0', '2.0.0', '1.0.0', '2.0.0'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0.0', '2.0.0', '1.0.0', '1.0.0']);
    });

    it('places malformed versions at the start (Infinity in descending)', () => {
      const versions = ['2.0.0', 'invalid', '1.0.0', 'bad'];
      const sorted = sortByVersion(versions);
      // Malformed versions parse to [Infinity], which sorts first in descending order
      expect(sorted.slice(0, 2)).toEqual(expect.arrayContaining(['invalid', 'bad']));
      expect(sorted.slice(2)).toEqual(['2.0.0', '1.0.0']);
    });

    it('does not mutate original array', () => {
      const original = ['1.0.0', '3.0.0', '2.0.0'];
      const originalCopy = [...original];
      sortByVersion(original);
      expect(original).toEqual(originalCopy);
    });

    it('handles versions with varying segment counts', () => {
      const versions = ['1.0.0', '2.0', '1.5', '1'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0', '1.5', '1.0.0', '1']);
    });
  });
});
