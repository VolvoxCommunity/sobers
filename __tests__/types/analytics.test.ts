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
      expect(AnalyticsEvents.ONBOARDING_STEP_COMPLETED).toBe('Onboarding Step Completed');
      expect(AnalyticsEvents.ONBOARDING_SOBRIETY_DATE_SET).toBe('Onboarding Sobriety Date Set');
      expect(AnalyticsEvents.ONBOARDING_COMPLETED).toBe('Onboarding Completed');
      expect(AnalyticsEvents.ONBOARDING_SCREEN_VIEWED).toBe('Onboarding Screen Viewed');
      expect(AnalyticsEvents.ONBOARDING_FIELD_COMPLETED).toBe('Onboarding Field Completed');
      expect(AnalyticsEvents.ONBOARDING_ABANDONED).toBe('Onboarding Abandoned');

      // Core Features events
      expect(AnalyticsEvents.SCREEN_VIEWED).toBe('Screen Viewed');
      expect(AnalyticsEvents.TASK_VIEWED).toBe('Task Viewed');
      expect(AnalyticsEvents.TASK_STARTED).toBe('Task Started');
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
      expect(AnalyticsEvents.MILESTONE_SHARED).toBe('Milestone Shared');
      expect(AnalyticsEvents.MILESTONE_CELEBRATED).toBe('Milestone Celebrated');

      // Social events
      expect(AnalyticsEvents.SPONSOR_CONNECTED).toBe('Sponsor Connected');
      expect(AnalyticsEvents.SPONSOR_INVITE_SENT).toBe('Sponsor Invite Sent');
      expect(AnalyticsEvents.SPONSOR_INVITE_ACCEPTED).toBe('Sponsor Invite Accepted');
      expect(AnalyticsEvents.SPONSEE_ADDED).toBe('Sponsee Added');
      expect(AnalyticsEvents.MESSAGE_SENT).toBe('Message Sent');
      expect(AnalyticsEvents.MESSAGE_READ).toBe('Message Read');

      // Engagement events
      expect(AnalyticsEvents.APP_OPENED).toBe('App Opened');
      expect(AnalyticsEvents.APP_BACKGROUNDED).toBe('App Backgrounded');
      expect(AnalyticsEvents.APP_SESSION_STARTED).toBe('App Session Started');
      expect(AnalyticsEvents.DAILY_CHECK_IN).toBe('Daily Check In');

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

  describe('AnalyticsEvents constant integrity', () => {
    it('should have exactly 37 events as documented', () => {
      const eventCount = Object.keys(AnalyticsEvents).length;
      expect(eventCount).toBe(37);
    });

    it('should not have duplicate event values', () => {
      const eventValues = Object.values(AnalyticsEvents);
      const uniqueValues = new Set(eventValues);
      expect(uniqueValues.size).toBe(eventValues.length);
    });

    it('should have all event keys in SCREAMING_SNAKE_CASE', () => {
      const eventKeys = Object.keys(AnalyticsEvents);
      eventKeys.forEach((key) => {
        // Should be all uppercase with underscores
        expect(key).toMatch(/^[A-Z_]+$/);
        // Should not have consecutive underscores
        expect(key).not.toMatch(/__/);
        // Should not start or end with underscore
        expect(key).not.toMatch(/^_|_$/);
      });
    });

    it('should have event key match event value pattern', () => {
      // AUTH_SIGN_UP -> 'Auth Sign Up'
      expect(AnalyticsEvents.AUTH_SIGN_UP).toBe('Auth Sign Up');
      expect(AnalyticsEvents.TASK_COMPLETED).toBe('Task Completed');
      expect(AnalyticsEvents.SPONSOR_CONNECTED).toBe('Sponsor Connected');
    });

    it('should have all authentication events', () => {
      expect(AnalyticsEvents.AUTH_SIGN_UP).toBeDefined();
      expect(AnalyticsEvents.AUTH_LOGIN).toBeDefined();
      expect(AnalyticsEvents.AUTH_LOGOUT).toBeDefined();
    });

    it('should have all onboarding events', () => {
      expect(AnalyticsEvents.ONBOARDING_STARTED).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_STEP_COMPLETED).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_SOBRIETY_DATE_SET).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_COMPLETED).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_SCREEN_VIEWED).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_FIELD_COMPLETED).toBeDefined();
      expect(AnalyticsEvents.ONBOARDING_ABANDONED).toBeDefined();
    });

    it('should have all core feature events', () => {
      expect(AnalyticsEvents.SCREEN_VIEWED).toBeDefined();
      expect(AnalyticsEvents.TASK_VIEWED).toBeDefined();
      expect(AnalyticsEvents.TASK_STARTED).toBeDefined();
      expect(AnalyticsEvents.TASK_COMPLETED).toBeDefined();
      expect(AnalyticsEvents.TASK_CREATED).toBeDefined();
      expect(AnalyticsEvents.TASK_SKIPPED).toBeDefined();
      expect(AnalyticsEvents.TASK_STREAK_UPDATED).toBeDefined();
    });

    it('should have all step events', () => {
      expect(AnalyticsEvents.STEP_VIEWED).toBeDefined();
      expect(AnalyticsEvents.STEP_STARTED).toBeDefined();
      expect(AnalyticsEvents.STEP_PROGRESS_SAVED).toBeDefined();
      expect(AnalyticsEvents.STEP_COMPLETED).toBeDefined();
    });

    it('should have all milestone events', () => {
      expect(AnalyticsEvents.MILESTONE_REACHED).toBeDefined();
      expect(AnalyticsEvents.MILESTONE_SHARED).toBeDefined();
      expect(AnalyticsEvents.MILESTONE_CELEBRATED).toBeDefined();
    });

    it('should have all social events', () => {
      expect(AnalyticsEvents.SPONSOR_CONNECTED).toBeDefined();
      expect(AnalyticsEvents.SPONSOR_INVITE_SENT).toBeDefined();
      expect(AnalyticsEvents.SPONSOR_INVITE_ACCEPTED).toBeDefined();
      expect(AnalyticsEvents.SPONSEE_ADDED).toBeDefined();
      expect(AnalyticsEvents.MESSAGE_SENT).toBeDefined();
      expect(AnalyticsEvents.MESSAGE_READ).toBeDefined();
    });

    it('should have all engagement events', () => {
      expect(AnalyticsEvents.APP_OPENED).toBeDefined();
      expect(AnalyticsEvents.APP_BACKGROUNDED).toBeDefined();
      expect(AnalyticsEvents.APP_SESSION_STARTED).toBeDefined();
      expect(AnalyticsEvents.DAILY_CHECK_IN).toBeDefined();
    });

    it('should have settings events', () => {
      expect(AnalyticsEvents.SETTINGS_CHANGED).toBeDefined();
    });

    it('should have all savings events', () => {
      expect(AnalyticsEvents.SAVINGS_GOAL_SET).toBeDefined();
      expect(AnalyticsEvents.SAVINGS_UPDATED).toBeDefined();
    });

    it('should be a const object (frozen)', () => {
      // TypeScript const assertions make the object readonly
      // Attempting to modify should fail in TypeScript (compile-time check)
      // At runtime, we can verify the type is correct
      expect(typeof AnalyticsEvents).toBe('object');
      expect(AnalyticsEvents).not.toBeNull();
    });

    it('should have event values that work as Amplitude event names', () => {
      // Amplitude recommends Title Case with spaces
      // Each word should start with capital letter
      const eventValues = Object.values(AnalyticsEvents);
      eventValues.forEach((value) => {
        // Should contain only letters and spaces
        expect(value).toMatch(/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/);
      });
    });
  });

  describe('Type safety', () => {
    it('should restrict AnalyticsEventName to valid event values only', () => {
      // This is a compile-time check, but we can verify at runtime
      const validEventName: AnalyticsEventName = 'Auth Sign Up';
      expect(validEventName).toBe(AnalyticsEvents.AUTH_SIGN_UP);

      // Invalid values would fail TypeScript compilation:
      // const invalid: AnalyticsEventName = 'Invalid Event'; // Type error
    });

    it('should allow all valid DaysSoberBucket values', () => {
      const buckets: DaysSoberBucket[] = [
        '0-7',
        '8-30',
        '31-90',
        '91-180',
        '181-365',
        '365+',
      ];
      
      buckets.forEach(bucket => {
        const prop: UserProperties = { days_sober_bucket: bucket };
        expect(prop.days_sober_bucket).toBe(bucket);
      });
    });

    it('should allow all valid StepsCompletedBucket values', () => {
      const buckets: StepsCompletedBucket[] = ['0', '1-3', '4-6', '7-9', '10-12'];
      
      buckets.forEach(bucket => {
        const prop: UserProperties = { steps_completed_count: bucket };
        expect(prop.steps_completed_count).toBe(bucket);
      });
    });

    it('should allow all valid theme preferences', () => {
      const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
      
      themes.forEach(theme => {
        const prop: UserProperties = { theme_preference: theme };
        expect(prop.theme_preference).toBe(theme);
      });
    });

    it('should allow all valid sign-in methods', () => {
      const methods: Array<'email' | 'google' | 'apple'> = ['email', 'google', 'apple'];
      
      methods.forEach(method => {
        const prop: UserProperties = { sign_in_method: method };
        expect(prop.sign_in_method).toBe(method);
      });
    });

    it('should allow valid EventParams with various value types', () => {
      const params: EventParams = {
        string_param: 'value',
        number_param: 42,
        boolean_param: true,
        array_param: ['item1', 'item2'],
        undefined_param: undefined,
      };

      expect(params.string_param).toBe('value');
      expect(params.number_param).toBe(42);
      expect(params.boolean_param).toBe(true);
      expect(params.array_param).toEqual(['item1', 'item2']);
      expect(params.undefined_param).toBeUndefined();
    });
  });

  describe('Documentation and discoverability', () => {
    it('should have events grouped logically by category', () => {
      // Events should be organized by functional area
      // Auth events: 3
      const authEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('AUTH_'));
      expect(authEvents).toHaveLength(3);

      // Onboarding events: 7
      const onboardingEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('ONBOARDING_'));
      expect(onboardingEvents).toHaveLength(7);

      // Task events: 6
      const taskEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('TASK_'));
      expect(taskEvents).toHaveLength(6);

      // Step events: 4
      const stepEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('STEP_'));
      expect(stepEvents).toHaveLength(4);

      // Milestone events: 3
      const milestoneEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('MILESTONE_'));
      expect(milestoneEvents).toHaveLength(3);

      // Social events: 6
      const socialEvents = Object.keys(AnalyticsEvents).filter(k => 
        k.startsWith('SPONSOR_') || k.startsWith('SPONSEE_') || k.startsWith('MESSAGE_')
      );
      expect(socialEvents).toHaveLength(6);

      // App/Engagement events: 4
      const appEvents = Object.keys(AnalyticsEvents).filter(k => 
        k.startsWith('APP_') || k === 'DAILY_CHECK_IN'
      );
      expect(appEvents).toHaveLength(4);

      // Settings events: 1
      const settingsEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('SETTINGS_'));
      expect(settingsEvents).toHaveLength(1);

      // Savings events: 2
      const savingsEvents = Object.keys(AnalyticsEvents).filter(k => k.startsWith('SAVINGS_'));
      expect(savingsEvents).toHaveLength(2);

      // Screen viewed: 1
      expect(AnalyticsEvents.SCREEN_VIEWED).toBeDefined();
    });

    it('should be easy to discover all events programmatically', () => {
      // Developer should be able to list all events easily
      const allEvents = Object.entries(AnalyticsEvents);
      
      expect(allEvents.length).toBeGreaterThan(0);
      
      allEvents.forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
        expect(key.length).toBeGreaterThan(0);
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });
