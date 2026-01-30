import { test, expect } from '@playwright/test';
import {
  ProgramPage,
  createDailyReadingsPage,
  createLiteraturePage,
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

  test('all placeholder screens should show coming soon message', async ({ page }) => {
    const screens = [
      { navigate: () => programPage.navigateToDaily(), factory: createDailyReadingsPage },
      { navigate: () => programPage.navigateToLiterature(), factory: createLiteraturePage },
    ];

    for (const { navigate, factory } of screens) {
      await navigate();
      const placeholderPage = factory(page);
      await placeholderPage.expectComingSoon();
    }
  });
});
