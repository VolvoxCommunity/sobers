/**
 * @fileoverview Savings calculation utilities for addiction spending tracking.
 *
 * Provides functions to calculate money saved since sobriety start date
 * based on historical addiction spending patterns.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Valid spending frequency values.
 */
export type SpendingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Calculated savings breakdown for display.
 */
export interface SavingsCalculation {
  /** Total money saved since sobriety start */
  totalSaved: number;
  /** Equivalent daily savings rate */
  perDay: number;
  /** Equivalent weekly savings rate */
  perWeek: number;
  /** Equivalent monthly savings rate */
  perMonth: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Divisors for converting spending amounts to daily rates.
 * Monthly uses average days per month (365/12 ≈ 30.44).
 */
export const FREQUENCY_DIVISORS: Record<SpendingFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 365 / 12,
  yearly: 365,
} as const;

// =============================================================================
// Functions
// =============================================================================

/**
 * Calculates the daily spending rate from amount and frequency.
 *
 * @param amount - The spending amount
 * @param frequency - How often this amount was spent
 * @returns The equivalent daily spending rate
 *
 * @example
 * ```ts
 * calculateDailyRate(70, 'weekly'); // Returns 10 ($70/week = $10/day)
 * ```
 */
export function calculateDailyRate(amount: number, frequency: SpendingFrequency): number {
  return amount / FREQUENCY_DIVISORS[frequency];
}

/**
 * Calculates savings breakdown based on spending history and days sober.
 *
 * @param amount - Historical spending amount
 * @param frequency - How often this amount was spent
 * @param daysSober - Number of days since sobriety start
 * @returns Savings breakdown with total and per-period amounts
 *
 * @example
 * ```ts
 * const savings = calculateSavings(50, 'weekly', 30);
 * // savings.totalSaved ≈ 214.29 ($50/week * 30 days / 7)
 * // savings.perDay ≈ 7.14
 * // savings.perWeek = 50
 * // savings.perMonth ≈ 217.39
 * ```
 */
export function calculateSavings(
  amount: number,
  frequency: SpendingFrequency,
  daysSober: number
): SavingsCalculation {
  const perDay = calculateDailyRate(amount, frequency);
  const totalSaved = perDay * daysSober;
  const perWeek = perDay * 7;
  const perMonth = perDay * FREQUENCY_DIVISORS.monthly;

  return {
    totalSaved,
    perDay,
    perWeek,
    perMonth,
  };
}

/**
 * Formats a number as USD currency string.
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * ```ts
 * formatCurrency(1234.5); // Returns "$1,234.50"
 * ```
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
