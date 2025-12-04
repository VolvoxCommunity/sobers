// =============================================================================
// Imports
// =============================================================================
import { formatProfileName } from '@/lib/format';
import { Profile } from '@/types/database';

// =============================================================================
// Tests
// =============================================================================
describe('formatProfileName', () => {
  test('formats full name with first name and last initial', () => {
    const profile: Partial<Profile> = {
      first_name: 'John',
      last_initial: 'D',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('John D.');
  });

  test('formats name with only first name when last initial is missing', () => {
    const profile: Partial<Profile> = {
      first_name: 'Jane',
      last_initial: null,
    };

    const result = formatProfileName(profile);

    expect(result).toBe('Jane');
  });

  test('handles undefined last initial', () => {
    const profile: Partial<Profile> = {
      first_name: 'Bob',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('Bob');
  });

  test('returns question mark when profile is null', () => {
    const result = formatProfileName(null);

    expect(result).toBe('?');
  });

  test('returns question mark when profile is undefined', () => {
    const result = formatProfileName(undefined);

    expect(result).toBe('?');
  });

  test('returns question mark when first name is missing', () => {
    const profile: Partial<Profile> = {
      last_initial: 'S',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('handles empty string first name', () => {
    const profile: Partial<Profile> = {
      first_name: '',
      last_initial: 'D',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('trims whitespace from first name', () => {
    const profile: Partial<Profile> = {
      first_name: '  Sarah  ',
      last_initial: 'J',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('Sarah J.');
  });
});
