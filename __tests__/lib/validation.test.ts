/**
 * Tests for validation utility functions
 */

import { isValidEmail, validateDisplayName } from '@/lib/validation';

describe('validation utilities', () => {
  // =============================================================================
  // isValidEmail
  // =============================================================================
  describe('isValidEmail', () => {
    describe('valid emails', () => {
      it('should return true for standard email format', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
      });

      it('should return true for email with subdomain', () => {
        expect(isValidEmail('user@mail.example.com')).toBe(true);
      });

      it('should return true for email with plus sign', () => {
        expect(isValidEmail('user+tag@example.com')).toBe(true);
      });

      it('should return true for email with numbers', () => {
        expect(isValidEmail('user123@example123.com')).toBe(true);
      });

      it('should return true for email with dots in local part', () => {
        expect(isValidEmail('first.last@example.com')).toBe(true);
      });

      it('should return true for email with hyphen in domain', () => {
        expect(isValidEmail('user@my-domain.com')).toBe(true);
      });

      it('should return true for email with underscore in local part', () => {
        expect(isValidEmail('user_name@example.com')).toBe(true);
      });

      it('should return true for email with various TLDs', () => {
        const validEmails = [
          'user@example.org',
          'user@example.net',
          'user@example.io',
          'user@example.co.uk',
        ];
        validEmails.forEach((email) => {
          expect(isValidEmail(email)).toBe(true);
        });
      });
    });

    describe('invalid emails', () => {
      it('should return false for empty string', () => {
        expect(isValidEmail('')).toBe(false);
      });

      it('should return false for null-like values', () => {
        // TypeScript would catch this, but test runtime behavior
        expect(isValidEmail(null as unknown as string)).toBe(false);
        expect(isValidEmail(undefined as unknown as string)).toBe(false);
      });

      it('should return false for email without @ symbol', () => {
        expect(isValidEmail('userexample.com')).toBe(false);
      });

      it('should return false for email without domain', () => {
        expect(isValidEmail('user@')).toBe(false);
      });

      it('should return false for email without local part', () => {
        expect(isValidEmail('@example.com')).toBe(false);
      });

      it('should return false for email without TLD', () => {
        expect(isValidEmail('user@example')).toBe(false);
      });

      it('should return false for email with spaces', () => {
        expect(isValidEmail('user @example.com')).toBe(false);
        expect(isValidEmail('user@ example.com')).toBe(false);
        expect(isValidEmail(' user@example.com')).toBe(false);
        expect(isValidEmail('user@example.com ')).toBe(false);
      });

      it('should return false for email with multiple @ symbols', () => {
        expect(isValidEmail('user@@example.com')).toBe(false);
        expect(isValidEmail('user@domain@example.com')).toBe(false);
      });

      it('should return false for plain text', () => {
        expect(isValidEmail('not an email')).toBe(false);
        expect(isValidEmail('justastring')).toBe(false);
      });
    });
  });

  // =============================================================================
  // validateDisplayName
  // =============================================================================
  describe('validateDisplayName', () => {
    describe('valid names', () => {
      it('accepts standard names', () => {
        expect(validateDisplayName('John D.')).toBeNull();
        expect(validateDisplayName('Mary Jane')).toBeNull();
        expect(validateDisplayName('Anne-Marie')).toBeNull();
      });

      it('accepts names with international characters', () => {
        expect(validateDisplayName('José')).toBeNull();
        expect(validateDisplayName('Müller')).toBeNull();
        expect(validateDisplayName('中文名字')).toBeNull();
      });

      it('accepts minimum length (2 chars)', () => {
        expect(validateDisplayName('Jo')).toBeNull();
      });

      it('accepts maximum length (30 chars)', () => {
        expect(validateDisplayName('A'.repeat(30))).toBeNull();
      });
    });

    describe('invalid names', () => {
      it('rejects empty string', () => {
        expect(validateDisplayName('')).toBe('Display name is required');
      });

      it('rejects whitespace-only', () => {
        expect(validateDisplayName('   ')).toBe('Display name is required');
      });

      it('rejects too short (1 char)', () => {
        expect(validateDisplayName('J')).toBe('Display name must be at least 2 characters');
      });

      it('rejects too long (31+ chars)', () => {
        expect(validateDisplayName('A'.repeat(31))).toBe(
          'Display name must be 30 characters or less'
        );
      });

      it('rejects numbers', () => {
        expect(validateDisplayName('John123')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects special characters', () => {
        expect(validateDisplayName('John@Doe')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects emojis', () => {
        expect(validateDisplayName('John 😀')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });
    });

    describe('edge cases', () => {
      it('trims whitespace before validation', () => {
        expect(validateDisplayName('  John D.  ')).toBeNull();
      });

      it('counts trimmed length', () => {
        expect(validateDisplayName('  J  ')).toBe('Display name must be at least 2 characters');
      });

    describe('boundary conditions', () => {
      it('accepts exactly 2 characters', () => {
        expect(validateDisplayName('Ab')).toBeNull();
      });

      it('accepts exactly 30 characters', () => {
        const name = 'A'.repeat(29) + 'b';
        expect(validateDisplayName(name)).toBeNull();
        expect(name.length).toBe(30);
      });

      it('rejects 31 characters', () => {
        const name = 'A'.repeat(31);
        expect(validateDisplayName(name)).toBe(
          'Display name must be 30 characters or less'
        );
      });

      it('rejects 1 character', () => {
        expect(validateDisplayName('A')).toBe('Display name must be at least 2 characters');
      });
    });

    describe('international character support', () => {
      it('accepts Arabic characters', () => {
        expect(validateDisplayName('محمد أحمد')).toBeNull();
      });

      it('accepts Cyrillic characters', () => {
        expect(validateDisplayName('Иван Петров')).toBeNull();
      });

      it('accepts Hebrew characters', () => {
        expect(validateDisplayName('דוד כהן')).toBeNull();
      });

      it('accepts Japanese characters', () => {
        expect(validateDisplayName('山田太郎')).toBeNull();
      });

      it('accepts Korean characters', () => {
        expect(validateDisplayName('김철수')).toBeNull();
      });

      it('accepts Greek characters', () => {
        expect(validateDisplayName('Νίκος Παπαδόπουλος')).toBeNull();
      });

      it('accepts mixed scripts', () => {
        expect(validateDisplayName('John 中文')).toBeNull();
      });

      it('accepts accented European characters', () => {
        expect(validateDisplayName('François Müller')).toBeNull();
        expect(validateDisplayName('Søren Øvergård')).toBeNull();
        expect(validateDisplayName('Łukasz Wójcik')).toBeNull();
      });
    });

    describe('allowed special characters', () => {
      it('accepts single period', () => {
        expect(validateDisplayName('John D.')).toBeNull();
      });

      it('accepts multiple periods', () => {
        expect(validateDisplayName('J.R.R. Tolkien')).toBeNull();
      });

      it('accepts single hyphen', () => {
        expect(validateDisplayName('Anne-Marie')).toBeNull();
      });

      it('accepts multiple hyphens', () => {
        expect(validateDisplayName('Jean-Claude Van-Damme')).toBeNull();
      });

      it('accepts hyphen at start', () => {
        expect(validateDisplayName('-John')).toBeNull();
      });

      it('accepts hyphen at end', () => {
        expect(validateDisplayName('John-')).toBeNull();
      });

      it('accepts period at start', () => {
        expect(validateDisplayName('.John')).toBeNull();
      });

      it('accepts period at end', () => {
        expect(validateDisplayName('John.')).toBeNull();
      });

      it('accepts multiple consecutive spaces', () => {
        expect(validateDisplayName('John  D')).toBeNull();
      });

      it('accepts mixed special characters', () => {
        expect(validateDisplayName('Mary-Jane S.')).toBeNull();
      });
    });

    describe('disallowed special characters', () => {
      const disallowedChars = [
        { char: '@', name: 'at symbol' },
        { char: '#', name: 'hash' },
        { char: '$', name: 'dollar sign' },
        { char: '%', name: 'percent' },
        { char: '&', name: 'ampersand' },
        { char: '*', name: 'asterisk' },
        { char: '(', name: 'parenthesis' },
        { char: ')', name: 'parenthesis' },
        { char: '_', name: 'underscore' },
        { char: '=', name: 'equals' },
        { char: '+', name: 'plus' },
        { char: '[', name: 'bracket' },
        { char: ']', name: 'bracket' },
        { char: '{', name: 'brace' },
        { char: '}', name: 'brace' },
        { char: '|', name: 'pipe' },
        { char: '\\', name: 'backslash' },
        { char: '/', name: 'forward slash' },
        { char: ':', name: 'colon' },
        { char: ';', name: 'semicolon' },
        { char: '"', name: 'quote' },
        { char: "'", name: 'apostrophe' },
        { char: '<', name: 'less than' },
        { char: '>', name: 'greater than' },
        { char: ',', name: 'comma' },
        { char: '?', name: 'question mark' },
        { char: '!', name: 'exclamation' },
        { char: '~', name: 'tilde' },
        { char: '`', name: 'backtick' },
      ];

      disallowedChars.forEach(({ char, name }) => {
        it(`rejects ${name} (${char})`, () => {
          expect(validateDisplayName(`John${char}Doe`)).toBe(
            'Display name can only contain letters, spaces, periods, and hyphens'
          );
        });
      });
    });

    describe('emoji and unicode edge cases', () => {
      it('rejects basic emojis', () => {
        expect(validateDisplayName('John 👍')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects complex emojis', () => {
        expect(validateDisplayName('John 👨‍👩‍👧‍👦')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects emoji modifiers', () => {
        expect(validateDisplayName('John 👋🏻')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects mathematical symbols', () => {
        expect(validateDisplayName('John ∑')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects currency symbols', () => {
        expect(validateDisplayName('John €')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects box drawing characters', () => {
        expect(validateDisplayName('John ┌─┐')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });
    });

    describe('whitespace handling', () => {
      it('trims leading whitespace', () => {
        expect(validateDisplayName('   John D.')).toBeNull();
      });

      it('trims trailing whitespace', () => {
        expect(validateDisplayName('John D.   ')).toBeNull();
      });

      it('trims both leading and trailing whitespace', () => {
        expect(validateDisplayName('  John D.  ')).toBeNull();
      });

      it('preserves internal whitespace', () => {
        expect(validateDisplayName('John   D.')).toBeNull();
      });

      it('rejects tab characters', () => {
        expect(validateDisplayName('John\tD.')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects newline characters', () => {
        expect(validateDisplayName('John\nD.')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects carriage return', () => {
        expect(validateDisplayName('John\rD.')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('counts length after trimming', () => {
        const name = '  ' + 'A'.repeat(31) + '  ';
        expect(validateDisplayName(name)).toBe(
          'Display name must be 30 characters or less'
        );
      });
    });

    describe('real-world name patterns', () => {
      it('accepts common Western names', () => {
        const names = [
          'John Smith',
          'Mary Jane',
          'Robert Jr.',
          'James T.',
          'Michael O.',
          'Sarah-Anne',
          'Jean-Pierre',
        ];
        names.forEach((name) => {
          expect(validateDisplayName(name)).toBeNull();
        });
      });

      it('accepts names with initials', () => {
        const names = ['J.K. Rowling', 'T.S. Eliot', 'C.S. Lewis', 'J.R.R. T.'];
        names.forEach((name) => {
          expect(validateDisplayName(name)).toBeNull();
        });
      });

      it('accepts hyphenated names', () => {
        const names = [
          'Mary-Anne',
          'Jean-Claude',
          'Anne-Marie-Louise',
          'Abdul-Rahman',
        ];
        names.forEach((name) => {
          expect(validateDisplayName(name)).toBeNull();
        });
      });

      it('accepts names with multiple parts', () => {
        const names = ['Maria del Carmen', 'José Luis García'];
        names.forEach((name) => {
          expect(validateDisplayName(name)).toBeNull();
        });
      });
    });

    describe('security and injection attempts', () => {
      it('rejects SQL injection attempt', () => {
        expect(validateDisplayName("Robert'; DROP TABLE users--")).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects XSS script tag', () => {
        expect(validateDisplayName('<script>alert(1)</script>')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects HTML entities', () => {
        expect(validateDisplayName('John&nbsp;Doe')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });

      it('rejects null bytes', () => {
        expect(validateDisplayName('John\x00Doe')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });
    });
  });
});
