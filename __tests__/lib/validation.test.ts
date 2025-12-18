/**
 * Tests for validation utility functions
 */

import {
  isValidEmail,
  validateDisplayName,
  validatePassword,
  checkPasswordRequirements,
  PASSWORD_REQUIREMENTS,
} from '@/lib/validation';

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

      it('rejects input containing only special characters', () => {
        expect(validateDisplayName('!!!!')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
        expect(validateDisplayName('@#$%')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
        expect(validateDisplayName('****')).toBe(
          'Display name can only contain letters, spaces, periods, and hyphens'
        );
      });
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
        expect(validateDisplayName(name)).toBe('Display name must be 30 characters or less');
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
        expect(validateDisplayName(name)).toBe('Display name must be 30 characters or less');
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
        const names = ['Mary-Anne', 'Jean-Claude', 'Anne-Marie-Louise', 'Abdul-Rahman'];
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

  // =============================================================================
  // PASSWORD_REQUIREMENTS
  // =============================================================================
  describe('PASSWORD_REQUIREMENTS', () => {
    it('has minimum length of 8', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(8);
    });

    it('requires uppercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
    });

    it('requires lowercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
    });

    it('requires numbers', () => {
      expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
    });

    it('requires symbols', () => {
      expect(PASSWORD_REQUIREMENTS.requireSymbol).toBe(true);
    });
  });

  // =============================================================================
  // checkPasswordRequirements
  // =============================================================================
  describe('checkPasswordRequirements', () => {
    describe('minLength check', () => {
      it('returns false for short passwords', () => {
        expect(checkPasswordRequirements('Pass1').minLength).toBe(false);
        expect(checkPasswordRequirements('1234567').minLength).toBe(false);
      });

      it('returns true for passwords with 8+ characters', () => {
        expect(checkPasswordRequirements('12345678').minLength).toBe(true);
        expect(checkPasswordRequirements('Password1').minLength).toBe(true);
        expect(checkPasswordRequirements('VeryLongPassword123').minLength).toBe(true);
      });
    });

    describe('hasUppercase check', () => {
      it('returns false for lowercase only', () => {
        expect(checkPasswordRequirements('password1').hasUppercase).toBe(false);
        expect(checkPasswordRequirements('test1234').hasUppercase).toBe(false);
      });

      it('returns true when uppercase present', () => {
        expect(checkPasswordRequirements('Password1').hasUppercase).toBe(true);
        expect(checkPasswordRequirements('pASSWORD').hasUppercase).toBe(true);
        expect(checkPasswordRequirements('A').hasUppercase).toBe(true);
      });
    });

    describe('hasLowercase check', () => {
      it('returns false for uppercase only', () => {
        expect(checkPasswordRequirements('PASSWORD1').hasLowercase).toBe(false);
        expect(checkPasswordRequirements('TEST1234').hasLowercase).toBe(false);
      });

      it('returns true when lowercase present', () => {
        expect(checkPasswordRequirements('Password1').hasLowercase).toBe(true);
        expect(checkPasswordRequirements('PASSWORDa').hasLowercase).toBe(true);
        expect(checkPasswordRequirements('a').hasLowercase).toBe(true);
      });
    });

    describe('hasNumber check', () => {
      it('returns false for letters only', () => {
        expect(checkPasswordRequirements('Password').hasNumber).toBe(false);
        expect(checkPasswordRequirements('TestPass').hasNumber).toBe(false);
      });

      it('returns true when number present', () => {
        expect(checkPasswordRequirements('Password1').hasNumber).toBe(true);
        expect(checkPasswordRequirements('1Password').hasNumber).toBe(true);
        expect(checkPasswordRequirements('Pass9word').hasNumber).toBe(true);
        expect(checkPasswordRequirements('0').hasNumber).toBe(true);
      });
    });

    describe('hasSymbol check', () => {
      it('returns false for alphanumeric only', () => {
        expect(checkPasswordRequirements('Password1').hasSymbol).toBe(false);
        expect(checkPasswordRequirements('Test1234').hasSymbol).toBe(false);
        expect(checkPasswordRequirements('abcABC123').hasSymbol).toBe(false);
      });

      it('returns true when common symbols present', () => {
        expect(checkPasswordRequirements('Password1!').hasSymbol).toBe(true);
        expect(checkPasswordRequirements('Test@1234').hasSymbol).toBe(true);
        expect(checkPasswordRequirements('Pass#word').hasSymbol).toBe(true);
        expect(checkPasswordRequirements('$').hasSymbol).toBe(true);
      });

      it('returns true for various symbol types', () => {
        const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
        symbols.forEach((symbol) => {
          expect(checkPasswordRequirements(symbol).hasSymbol).toBe(true);
        });
      });
    });

    describe('combined checks', () => {
      it('all pass for strong password', () => {
        const checks = checkPasswordRequirements('StrongPass1!');
        expect(checks.minLength).toBe(true);
        expect(checks.hasUppercase).toBe(true);
        expect(checks.hasLowercase).toBe(true);
        expect(checks.hasNumber).toBe(true);
        expect(checks.hasSymbol).toBe(true);
      });

      it('all fail for empty string', () => {
        const checks = checkPasswordRequirements('');
        expect(checks.minLength).toBe(false);
        expect(checks.hasUppercase).toBe(false);
        expect(checks.hasLowercase).toBe(false);
        expect(checks.hasNumber).toBe(false);
        expect(checks.hasSymbol).toBe(false);
      });

      it('returns partial results for weak passwords', () => {
        const checks = checkPasswordRequirements('pass');
        expect(checks.minLength).toBe(false);
        expect(checks.hasUppercase).toBe(false);
        expect(checks.hasLowercase).toBe(true);
        expect(checks.hasNumber).toBe(false);
        expect(checks.hasSymbol).toBe(false);
      });
    });
  });

  // =============================================================================
  // validatePassword
  // =============================================================================
  describe('validatePassword', () => {
    describe('valid passwords', () => {
      it('accepts passwords meeting all requirements', () => {
        expect(validatePassword('Password1!')).toBeNull();
        expect(validatePassword('StrongPass123@')).toBeNull();
        expect(validatePassword('MyP4ssword#')).toBeNull();
        expect(validatePassword('Test1234$')).toBeNull();
      });

      it('accepts passwords with various special characters', () => {
        expect(validatePassword('Password1!')).toBeNull();
        expect(validatePassword('Strong@Pass1')).toBeNull();
        expect(validatePassword('Test#123Ab')).toBeNull();
        expect(validatePassword('Secure$Pass9')).toBeNull();
      });

      it('accepts exactly 8 characters with all requirements', () => {
        expect(validatePassword('Passw0!d')).toBeNull();
      });

      it('accepts long passwords', () => {
        expect(validatePassword('VeryLongAndSecurePassword123!')).toBeNull();
      });
    });

    describe('too short', () => {
      it('rejects passwords under 8 characters', () => {
        expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
        expect(validatePassword('Ab1')).toBe('Password must be at least 8 characters');
        expect(validatePassword('1234567')).toBe('Password must be at least 8 characters');
      });

      it('rejects empty string', () => {
        expect(validatePassword('')).toBe('Password must be at least 8 characters');
      });
    });

    describe('missing uppercase', () => {
      it('rejects passwords without uppercase', () => {
        expect(validatePassword('password1')).toBe(
          'Password must contain at least one uppercase letter'
        );
        expect(validatePassword('test1234')).toBe(
          'Password must contain at least one uppercase letter'
        );
        expect(validatePassword('12345678')).toBe(
          'Password must contain at least one uppercase letter'
        );
      });
    });

    describe('missing lowercase', () => {
      it('rejects passwords without lowercase', () => {
        expect(validatePassword('PASSWORD1')).toBe(
          'Password must contain at least one lowercase letter'
        );
        expect(validatePassword('TEST1234')).toBe(
          'Password must contain at least one lowercase letter'
        );
        expect(validatePassword('ABCD1234')).toBe(
          'Password must contain at least one lowercase letter'
        );
      });
    });

    describe('missing number', () => {
      it('rejects passwords without numbers', () => {
        expect(validatePassword('Password!')).toBe('Password must contain at least one number');
        expect(validatePassword('StrongPass@')).toBe('Password must contain at least one number');
        expect(validatePassword('AbcdEfgh#')).toBe('Password must contain at least one number');
      });
    });

    describe('missing symbol', () => {
      it('rejects passwords without symbols', () => {
        expect(validatePassword('Password1')).toBe('Password must contain at least one symbol');
        expect(validatePassword('StrongPass123')).toBe('Password must contain at least one symbol');
        expect(validatePassword('AbcdEfgh99')).toBe('Password must contain at least one symbol');
      });
    });

    describe('error priority', () => {
      it('reports length error first', () => {
        expect(validatePassword('abc')).toBe('Password must be at least 8 characters');
      });

      it('reports uppercase error after length', () => {
        expect(validatePassword('password123!')).toBe(
          'Password must contain at least one uppercase letter'
        );
      });

      it('reports lowercase error after uppercase', () => {
        expect(validatePassword('PASSWORD123!')).toBe(
          'Password must contain at least one lowercase letter'
        );
      });

      it('reports number error after lowercase', () => {
        expect(validatePassword('Password!')).toBe('Password must contain at least one number');
      });

      it('reports symbol error last', () => {
        expect(validatePassword('Password1')).toBe('Password must contain at least one symbol');
      });
    });

    describe('edge cases', () => {
      it('handles unicode letters', () => {
        // Unicode lowercase and uppercase should work
        expect(validatePassword('Pässwörd1!')).toBeNull();
      });

      it('handles spaces in password', () => {
        expect(validatePassword('Pass word1!')).toBeNull();
      });

      it('handles all requirements met', () => {
        expect(validatePassword('12345Aa!')).toBeNull();
      });
    });
  });
});
