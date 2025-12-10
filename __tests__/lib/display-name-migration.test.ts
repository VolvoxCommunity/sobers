/**
 * Integration tests for display name migration from first_name/last_initial
 * 
 * These tests ensure that the migration from the old profile schema
 * (first_name + last_initial) to the new schema (display_name) works correctly
 * across the entire application.
 */

import { formatProfileName } from '@/lib/format';
import { validateDisplayName } from '@/lib/validation';
import { Profile } from '@/types/database';

describe('Display Name Migration Integration', () => {
  describe('end-to-end validation and formatting', () => {
    it('validates and formats a typical migrated display name', () => {
      const displayName = 'John D.';
      
      // Validation should pass
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();
      
      // Formatting should preserve the name
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('John D.');
    });

    it('handles validation failure gracefully', () => {
      const invalidDisplayName = 'J'; // Too short
      
      // Validation should fail
      const validationError = validateDisplayName(invalidDisplayName);
      expect(validationError).toBe('Display name must be at least 2 characters');
      
      // But formatting would still work if somehow stored
      const profile: Partial<Profile> = { display_name: invalidDisplayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('J');
    });

    it('handles missing display name in new format', () => {
      const profile: Partial<Profile> = {
        display_name: null,
      };
      
      // Formatting should return placeholder
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('validates and formats international characters', () => {
      const displayName = 'José García';
      
      // Validation should pass
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();
      
      // Formatting should preserve international characters
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('José García');
    });

    it('validates and formats names with hyphens', () => {
      const displayName = 'Anne-Marie';
      
      // Validation should pass
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();
      
      // Formatting should preserve hyphens
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('Anne-Marie');
    });

    it('validates and formats names with periods', () => {
      const displayName = 'J.R.R. T.';
      
      // Validation should pass
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();
      
      // Formatting should preserve periods
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('J.R.R. T.');
    });
  });

  describe('migration edge cases', () => {
    it('handles profiles during transition with null display_name', () => {
      const profile: Partial<Profile> = {
        id: '123',
        email: 'test@example.com',
        display_name: null,
      };
      
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('handles profiles with empty string display_name', () => {
      const profile: Partial<Profile> = {
        display_name: '',
      };
      
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('handles profiles with whitespace-only display_name', () => {
      const profile: Partial<Profile> = {
        display_name: '   ',
      };
      
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('trims whitespace from migrated display names', () => {
      const displayName = '  John D.  ';
      
      // Validation should pass (trims internally)
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();
      
      // Formatting should trim
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('John D.');
    });
  });

  describe('backward compatibility scenarios', () => {
    it('handles profile with only ID (minimal profile)', () => {
      const profile: Partial<Profile> = {
        id: '123',
      };
      
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('handles profile with all optional fields missing', () => {
      const profile: Partial<Profile> = {};
      
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('?');
    });

    it('handles null profile', () => {
      const formatted = formatProfileName(null);
      expect(formatted).toBe('?');
    });

    it('handles undefined profile', () => {
      const formatted = formatProfileName(undefined);
      expect(formatted).toBe('?');
    });
  });

  describe('data consistency checks', () => {
    it('ensures validated display names can always be formatted', () => {
      const testCases = [
        'Jo',
        'John Smith',
        'Mary-Jane',
        'J.R.R. Tolkien',
        'José García',
        'A'.repeat(30),
      ];

      testCases.forEach((displayName) => {
        // All should pass validation
        const validationError = validateDisplayName(displayName);
        expect(validationError).toBeNull();

        // All should format correctly
        const profile: Partial<Profile> = { display_name: displayName };
        const formatted = formatProfileName(profile);
        expect(formatted).toBe(displayName);
      });
    });

    it('ensures formatting is idempotent', () => {
      const displayName = 'John D.';
      const profile: Partial<Profile> = { display_name: displayName };

      const formatted1 = formatProfileName(profile);
      const formatted2 = formatProfileName(profile);
      const formatted3 = formatProfileName(profile);

      expect(formatted1).toBe(formatted2);
      expect(formatted2).toBe(formatted3);
      expect(formatted1).toBe('John D.');
    });

    it('ensures validation is consistent', () => {
      const displayName = 'John D.';

      const result1 = validateDisplayName(displayName);
      const result2 = validateDisplayName(displayName);
      const result3 = validateDisplayName(displayName);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBeNull();
    });
  });

  describe('typical user workflows', () => {
    it('simulates OAuth sign-in creating profile with display name', () => {
      // Simulates: User signs in with Apple/Google
      // OAuth provides givenName="John" and familyName="Doe"
      // App creates display name="John D."
      const oauthGivenName = 'John';
      const oauthFamilyName = 'Doe';
      const displayName = `${oauthGivenName} ${oauthFamilyName[0]}.`;

      // Validation should pass
      const validationError = validateDisplayName(displayName);
      expect(validationError).toBeNull();

      // Profile should be created with this display name
      const profile: Partial<Profile> = { display_name: displayName };
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('John D.');
    });

    it('simulates user updating their display name in settings', () => {
      // Current name
      const currentName = 'John D.';
      const profile: Partial<Profile> = { display_name: currentName };

      // User wants to change to new name
      const newName = 'John Doe';

      // Validate new name
      const validationError = validateDisplayName(newName);
      expect(validationError).toBeNull();

      // Update profile
      profile.display_name = newName;

      // Verify new name is formatted correctly
      const formatted = formatProfileName(profile);
      expect(formatted).toBe('John Doe');
    });

    it('simulates onboarding flow with display name entry', () => {
      // User creates account
      const profile: Partial<Profile> = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        display_name: null, // Not yet filled in
      };

      // Before onboarding completion
      expect(formatProfileName(profile)).toBe('?');

      // User enters display name during onboarding
      const enteredName = '  Sarah M.  '; // User might include whitespace

      // Validate (should trim and pass)
      const validationError = validateDisplayName(enteredName);
      expect(validationError).toBeNull();

      // Save trimmed version
      profile.display_name = enteredName.trim();

      // After onboarding completion
      expect(formatProfileName(profile)).toBe('Sarah M.');
    });
  });

  describe('security and data integrity', () => {
    it('rejects display names with potential XSS', () => {
      const maliciousName = '<script>alert("xss")</script>';
      const validationError = validateDisplayName(maliciousName);
      expect(validationError).toBe(
        'Display name can only contain letters, spaces, periods, and hyphens'
      );
    });

    it('rejects display names with SQL injection patterns', () => {
      const maliciousName = "John'; DROP TABLE profiles; --";
      const validationError = validateDisplayName(maliciousName);
      expect(validationError).toBe(
        'Display name can only contain letters, spaces, periods, and hyphens'
      );
    });

    it('rejects display names with null bytes', () => {
      const maliciousName = 'John\x00Admin';
      const validationError = validateDisplayName(maliciousName);
      expect(validationError).toBe(
        'Display name can only contain letters, spaces, periods, and hyphens'
      );
    });

    it('handles extremely long inputs gracefully', () => {
      const veryLongName = 'A'.repeat(1000);
      const validationError = validateDisplayName(veryLongName);
      expect(validationError).toBe('Display name must be 30 characters or less');
    });
  });
});