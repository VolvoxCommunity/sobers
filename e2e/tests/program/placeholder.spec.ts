import { test, expect } from '@playwright/test';
import {
  ProgramPage,
  createDailyReadingsPage,
  createPrayersPage,
  createLiteraturePage,
  createMeetingsPage,
} from '../../pages/program.page';

test.describe('Program Placeholder Screens', () => {
  let programPage: ProgramPage;

  test.beforeEach(async ({ page }) => {
    programPage = new ProgramPage(page);
    await programPage.goto();
  });

  test.describe('Daily Readings', () => {
    test('should display daily readings placeholder screen', async ({ page }) => {
      await programPage.navigateToDaily();

      const dailyPage = createDailyReadingsPage(page);
      await dailyPage.expectOnPlaceholderScreen();
    });

    test('should show correct title', async ({ page }) => {
      await programPage.navigateToDaily();

      const dailyPage = createDailyReadingsPage(page);
      const title = await dailyPage.getTitle();
      expect(title).toBe('Daily Readings');
    });

    test('should show coming soon subtitle', async ({ page }) => {
      await programPage.navigateToDaily();

      const dailyPage = createDailyReadingsPage(page);
      await dailyPage.expectComingSoon();
    });
  });

  test.describe('Prayers', () => {
    test('should display prayers placeholder screen', async ({ page }) => {
      await programPage.navigateToPrayers();

      const prayersPage = createPrayersPage(page);
      await prayersPage.expectOnPlaceholderScreen();
    });

    test('should show correct title', async ({ page }) => {
      await programPage.navigateToPrayers();

      const prayersPage = createPrayersPage(page);
      const title = await prayersPage.getTitle();
      expect(title).toBe('Prayers');
    });

    test('should show coming soon subtitle', async ({ page }) => {
      await programPage.navigateToPrayers();

      const prayersPage = createPrayersPage(page);
      await prayersPage.expectComingSoon();
    });
  });

  test.describe('Literature', () => {
    test('should display literature placeholder screen', async ({ page }) => {
      await programPage.navigateToLiterature();

      const literaturePage = createLiteraturePage(page);
      await literaturePage.expectOnPlaceholderScreen();
    });

    test('should show correct title', async ({ page }) => {
      await programPage.navigateToLiterature();

      const literaturePage = createLiteraturePage(page);
      const title = await literaturePage.getTitle();
      expect(title).toBe('Literature');
    });

    test('should show coming soon subtitle', async ({ page }) => {
      await programPage.navigateToLiterature();

      const literaturePage = createLiteraturePage(page);
      await literaturePage.expectComingSoon();
    });
  });

  test.describe('Meetings', () => {
    test('should display meetings placeholder screen', async ({ page }) => {
      await programPage.navigateToMeetings();

      const meetingsPage = createMeetingsPage(page);
      await meetingsPage.expectOnPlaceholderScreen();
    });

    test('should show correct title', async ({ page }) => {
      await programPage.navigateToMeetings();

      const meetingsPage = createMeetingsPage(page);
      const title = await meetingsPage.getTitle();
      expect(title).toBe('Meetings');
    });

    test('should show coming soon subtitle', async ({ page }) => {
      await programPage.navigateToMeetings();

      const meetingsPage = createMeetingsPage(page);
      await meetingsPage.expectComingSoon();
    });
  });

  test('all placeholder screens should show coming soon message', async ({ page }) => {
    const screens = [
      { navigate: () => programPage.navigateToDaily(), factory: createDailyReadingsPage },
      { navigate: () => programPage.navigateToPrayers(), factory: createPrayersPage },
      { navigate: () => programPage.navigateToLiterature(), factory: createLiteraturePage },
      { navigate: () => programPage.navigateToMeetings(), factory: createMeetingsPage },
    ];

    for (const { navigate, factory } of screens) {
      await navigate();
      const placeholderPage = factory(page);
      await placeholderPage.expectComingSoon();
    }
  });
});
