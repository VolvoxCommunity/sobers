/**
 * Tests for validation utility functions
 */

import { isValidEmail } from './validation';

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
});
