// __tests__/types/analytics.test.ts
import {
  AnalyticsEvents,
  type AnalyticsEventName,
  type EventParams,
  type UserProperties,
  type DaysSoberBucket,
  type StepsCompletedBucket,
  type AnalyticsConfig,
} from '@/types/analytics';

describe('types/analytics', () => {
  describe('AnalyticsEvents', () => {
    it('should have all required event constants', () => {
      // Auth events
      expect(AnalyticsEvents.AUTH_SIGN_UP).toBe('Auth Sign Up');
      expect(AnalyticsEvents.AUTH_LOGIN).toBe('Auth Login');
      expect(AnalyticsEvents.AUTH_LOGOUT).toBe('Auth Logout');

      // Onboarding events
      expect(AnalyticsEvents.ONBOARDING_STARTED).toBe('Onboarding Started');
      expect(AnalyticsEvents.ONBOARDING_COMPLETED).toBe('Onboarding Completed');
      expect(AnalyticsEvents.ONBOARDING_SCREEN_VIEWED).toBe('Onboarding Screen Viewed');
      expect(AnalyticsEvents.ONBOARDING_FIELD_COMPLETED).toBe('Onboarding Field Completed');
      expect(AnalyticsEvents.ONBOARDING_ABANDONED).toBe('Onboarding Abandoned');

      // Task events
      expect(AnalyticsEvents.TASK_COMPLETED).toBe('Task Completed');
      expect(AnalyticsEvents.TASK_CREATED).toBe('Task Created');
      expect(AnalyticsEvents.TASK_SKIPPED).toBe('Task Skipped');
      expect(AnalyticsEvents.TASK_STREAK_UPDATED).toBe('Task Streak Updated');

      // Step events
      expect(AnalyticsEvents.STEP_VIEWED).toBe('Step Viewed');
      expect(AnalyticsEvents.STEP_STARTED).toBe('Step Started');
      expect(AnalyticsEvents.STEP_PROGRESS_SAVED).toBe('Step Progress Saved');
      expect(AnalyticsEvents.STEP_COMPLETED).toBe('Step Completed');

      // Milestone events
      expect(AnalyticsEvents.MILESTONE_REACHED).toBe('Milestone Reached');
      expect(AnalyticsEvents.MILESTONE_CELEBRATED).toBe('Milestone Celebrated');

      // Social events
      expect(AnalyticsEvents.SPONSEE_ADDED).toBe('Sponsee Added');
      expect(AnalyticsEvents.MESSAGE_READ).toBe('Message Read');

      // Engagement events
      expect(AnalyticsEvents.APP_BACKGROUNDED).toBe('App Backgrounded');
      expect(AnalyticsEvents.APP_SESSION_STARTED).toBe('App Session Started');

      // Settings events
      expect(AnalyticsEvents.SETTINGS_CHANGED).toBe('Settings Changed');

      // Savings events
      expect(AnalyticsEvents.SAVINGS_GOAL_SET).toBe('Savings Goal Set');
      expect(AnalyticsEvents.SAVINGS_UPDATED).toBe('Savings Updated');
    });

    it('should use Title Case naming convention', () => {
      const eventValues = Object.values(AnalyticsEvents);
      eventValues.forEach((value) => {
        // Title Case: first letter of each word is uppercase
        const words = value.split(' ');
        words.forEach((word) => {
          expect(word[0]).toBe(word[0].toUpperCase());
        });
      });
    });

    it('should have a reasonable number of events', () => {
      const eventCount = Object.keys(AnalyticsEvents).length;
      // Sanity check that events are defined - exact count is intentionally not tested
      // to avoid brittle tests that break when events are legitimately added/removed
      expect(eventCount).toBeGreaterThan(0);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid EventParams', () => {
      const params: EventParams = {
        task_id: '123',
        count: 5,
        is_first: true,
        tags: ['tag1', 'tag2'],
      };
      expect(params).toBeDefined();
    });

    it('should allow valid UserProperties', () => {
      const props: UserProperties = {
        days_sober_bucket: '31-90',
        has_sponsor: true,
        has_sponsees: false,
        theme_preference: 'dark',
        sign_in_method: 'google',
        onboarding_completed: true,
        task_streak_current: 7,
        steps_completed_count: '4-6',
        savings_goal_set: true,
      };
      expect(props).toBeDefined();
    });

    it('should allow valid DaysSoberBucket values', () => {
      const buckets: DaysSoberBucket[] = ['0-7', '8-30', '31-90', '91-180', '181-365', '365+'];
      expect(buckets).toHaveLength(6);
    });

    it('should allow valid StepsCompletedBucket values', () => {
      const buckets: StepsCompletedBucket[] = ['0', '1-3', '4-6', '7-9', '10-12'];
      expect(buckets).toHaveLength(5);
    });

    it('should allow valid AnalyticsConfig', () => {
      const config: AnalyticsConfig = {
        apiKey: 'test-api-key',
      };
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should derive AnalyticsEventName from AnalyticsEvents values', () => {
      const eventName: AnalyticsEventName = 'Auth Sign Up';
      expect(eventName).toBe(AnalyticsEvents.AUTH_SIGN_UP);
    });
  });
});
