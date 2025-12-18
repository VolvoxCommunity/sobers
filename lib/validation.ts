/**
 * Validation utility functions
 */

/**
 * Regex pattern for valid display names.
 * Allows: letters (any language via \p{L}), regular spaces, periods, hyphens
 * Note: Uses space character ' ' instead of \s to exclude tabs, newlines, etc.
 * Length: 2-30 characters (enforced separately for better error messages)
 */
const DISPLAY_NAME_REGEX = /^[\p{L} .\-]+$/u;

/**
 * Validates email address format
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  // Basic email regex - validates format like user@domain.com
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password requirements constants (matches Supabase Auth settings)
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
} as const;

/**
 * Individual password requirement check results
 */
export interface PasswordRequirementCheck {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

/**
 * Checks each password requirement individually.
 * Useful for showing real-time feedback as user types.
 *
 * @param password - The password to check
 * @returns Object with boolean for each requirement
 *
 * @example
 * ```ts
 * const checks = checkPasswordRequirements('Pass1');
 * // { minLength: false, hasUppercase: true, hasLowercase: true, hasNumber: true }
 * ```
 */
export function checkPasswordRequirements(password: string): PasswordRequirementCheck {
  return {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };
}

/**
 * Validates a password against security requirements (matches Supabase Auth settings).
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one symbol (!@#$%^&*()_+-=[]{}|;':",./<>?`~)
 *
 * @param password - The password to validate
 * @returns Error message string if invalid, null if valid
 *
 * @example
 * ```ts
 * validatePassword('weak');      // 'Password must be at least 8 characters'
 * validatePassword('WeakPass1'); // 'Password must contain at least one symbol'
 * validatePassword('Strong1!');  // null (valid)
 * ```
 */
export function validatePassword(password: string): string | null {
  const checks = checkPasswordRequirements(password);

  if (!checks.minLength) {
    return 'Password must be at least 8 characters';
  }

  if (!checks.hasUppercase) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!checks.hasLowercase) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!checks.hasNumber) {
    return 'Password must contain at least one number';
  }

  if (!checks.hasSymbol) {
    return 'Password must contain at least one symbol';
  }

  return null;
}

/**
 * Validates a display name for user profiles.
 *
 * Rules:
 * - Required (non-empty after trimming)
 * - 2-30 characters
 * - Only letters (any language), spaces, periods, and hyphens
 *
 * @param name - The display name to validate
 * @returns Error message string if invalid, null if valid
 *
 * @example
 * ```ts
 * validateDisplayName('John D.'); // null (valid)
 * validateDisplayName('J'); // 'Display name must be at least 2 characters'
 * validateDisplayName('John@123'); // 'Display name can only contain...'
 * ```
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Display name is required';
  }

  if (trimmed.length < 2) {
    return 'Display name must be at least 2 characters';
  }

  if (trimmed.length > 30) {
    return 'Display name must be 30 characters or less';
  }

  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return 'Display name can only contain letters, spaces, periods, and hyphens';
  }

  return null;
}
