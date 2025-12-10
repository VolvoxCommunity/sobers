// =============================================================================
// Imports
// =============================================================================
import { formatProfileName } from '@/lib/format';
import { Profile } from '@/types/database';

// =============================================================================
// Tests
// =============================================================================
describe('formatProfileName', () => {
  test('returns display name when present', () => {
    const profile: Partial<Profile> = {
      display_name: 'John D.',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('John D.');
  });

  test('returns question mark when profile is null', () => {
    const result = formatProfileName(null);

    expect(result).toBe('?');
  });

  test('returns question mark when profile is undefined', () => {
    const result = formatProfileName(undefined);

    expect(result).toBe('?');
  });

  test('returns question mark when display name is missing', () => {
    const profile: Partial<Profile> = {};

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('returns question mark when display name is null', () => {
    const profile: Partial<Profile> = {
      display_name: null,
    };

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('returns question mark for empty string display name', () => {
    const profile: Partial<Profile> = {
      display_name: '',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('returns question mark for whitespace-only display name', () => {
    const profile: Partial<Profile> = {
      display_name: '   ',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('?');
  });

  test('trims whitespace from display name', () => {
    const profile: Partial<Profile> = {
      display_name: '  Sarah J.  ',
    };

    const result = formatProfileName(profile);

    expect(result).toBe('Sarah J.');
  });

  describe('edge cases with special characters', () => {
    test('handles display name with only spaces and periods', () => {
      const profile: Partial<Profile> = {
        display_name: '...',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('...');
    });

    test('handles display name with only hyphens', () => {
      const profile: Partial<Profile> = {
        display_name: '---',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('---');
    });

    test('handles display name with mixed special characters', () => {
      const profile: Partial<Profile> = {
        display_name: 'Mary-Jane S.',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('Mary-Jane S.');
    });

    test('handles display name with leading period', () => {
      const profile: Partial<Profile> = {
        display_name: '.John',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('.John');
    });

    test('handles display name with trailing hyphen', () => {
      const profile: Partial<Profile> = {
        display_name: 'John-',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John-');
    });
  });

  describe('international character handling', () => {
    test('handles Chinese characters', () => {
      const profile: Partial<Profile> = {
        display_name: '李明',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('李明');
    });

    test('handles Arabic characters', () => {
      const profile: Partial<Profile> = {
        display_name: 'محمد',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('محمد');
    });

    test('handles Cyrillic characters', () => {
      const profile: Partial<Profile> = {
        display_name: 'Иван',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('Иван');
    });

    test('handles mixed scripts', () => {
      const profile: Partial<Profile> = {
        display_name: 'John 中文',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John 中文');
    });

    test('handles accented characters', () => {
      const profile: Partial<Profile> = {
        display_name: 'José García',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('José García');
    });
  });

  describe('whitespace edge cases', () => {
    test('trims leading whitespace', () => {
      const profile: Partial<Profile> = {
        display_name: '   John D.',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John D.');
    });

    test('trims trailing whitespace', () => {
      const profile: Partial<Profile> = {
        display_name: 'John D.   ',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John D.');
    });

    test('trims both leading and trailing whitespace', () => {
      const profile: Partial<Profile> = {
        display_name: '  John D.  ',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John D.');
    });

    test('preserves internal whitespace', () => {
      const profile: Partial<Profile> = {
        display_name: 'John   D.',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John   D.');
    });

    test('returns question mark for only whitespace after trim', () => {
      const profile: Partial<Profile> = {
        display_name: '     ',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('?');
    });
  });

  describe('length boundary cases', () => {
    test('handles maximum length display name (30 chars)', () => {
      const profile: Partial<Profile> = {
        display_name: 'A'.repeat(30),
      };

      const result = formatProfileName(profile);

      expect(result).toBe('A'.repeat(30));
    });

    test('handles minimum length display name (2 chars)', () => {
      const profile: Partial<Profile> = {
        display_name: 'Jo',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('Jo');
    });

    test('handles single character display name', () => {
      const profile: Partial<Profile> = {
        display_name: 'J',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('J');
    });
  });

  describe('type safety and nullish coalescing', () => {
    test('handles profile with only other fields', () => {
      const profile: Partial<Profile> = {
        id: '123',
        email: 'test@example.com',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('?');
    });

    test('handles empty object profile', () => {
      const profile: Partial<Profile> = {};

      const result = formatProfileName(profile);

      expect(result).toBe('?');
    });

    test('consistently returns question mark for all null-like values', () => {
      expect(formatProfileName(null)).toBe('?');
      expect(formatProfileName(undefined)).toBe('?');
      expect(formatProfileName({ display_name: null })).toBe('?');
      expect(formatProfileName({ display_name: undefined })).toBe('?');
      expect(formatProfileName({ display_name: '' })).toBe('?');
      expect(formatProfileName({ display_name: '  ' })).toBe('?');
    });
  });

  describe('real-world migration scenarios', () => {
    test('handles newly migrated profile with display name', () => {
      const profile: Partial<Profile> = {
        display_name: 'John D.',
      };

      const result = formatProfileName(profile);

      expect(result).toBe('John D.');
    });

    test('handles profile during transition (null display name)', () => {
      const profile: Partial<Profile> = {
        id: '123',
        display_name: null,
      };

      const result = formatProfileName(profile);

      expect(result).toBe('?');
    });

    test('handles various valid display name formats', () => {
      const validFormats = [
        'John D.',
        'Mary Jane',
        'Anne-Marie',
        'J.R.R. T.',
        'José García',
        'O\'Brien',
      ];

      // Note: O'Brien contains apostrophe which is not in the allowed character set
      // according to validation rules, but we test formatting behavior here
      validFormats.forEach((displayName) => {
        const profile: Partial<Profile> = { display_name: displayName };
        const result = formatProfileName(profile);
        
        // For O'Brien, it should still format it even though it wouldn't pass validation
        expect(result).toBe(displayName);
      });
    });
  });
});
