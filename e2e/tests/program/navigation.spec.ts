import { test, expect } from '@playwright/test';
import { ProgramPage } from '../../pages/program.page';

test.describe('Program Navigation', () => {
  let programPage: ProgramPage;

  test.beforeEach(async ({ page }) => {
    programPage = new ProgramPage(page);
    await programPage.goto();
  });

  test('should display program tab bar', async () => {
    await programPage.expectOnProgramPage();
    await expect(programPage.tabBar).toBeVisible();
  });

  test('should display all program tabs', async () => {
    await expect(programPage.stepsTab).toBeVisible();
    await expect(programPage.dailyTab).toBeVisible();
    await expect(programPage.prayersTab).toBeVisible();
    await expect(programPage.literatureTab).toBeVisible();
    await expect(programPage.meetingsTab).toBeVisible();
  });

  test('should redirect /program to /program/steps by default', async ({ page }) => {
    await expect(page).toHaveURL(/.*program\/steps/);
  });

  test('should navigate to daily readings tab', async ({ page }) => {
    await programPage.navigateToDaily();
    await expect(page).toHaveURL(/.*program\/daily/);
  });

  test('should navigate to prayers tab', async ({ page }) => {
    await programPage.navigateToPrayers();
    await expect(page).toHaveURL(/.*program\/prayers/);
  });

  test('should navigate to literature tab', async ({ page }) => {
    await programPage.navigateToLiterature();
    await expect(page).toHaveURL(/.*program\/literature/);
  });

  test('should navigate to meetings tab', async ({ page }) => {
    await programPage.navigateToMeetings();
    await expect(page).toHaveURL(/.*program\/meetings/);
  });

  test('should navigate back to steps tab', async ({ page }) => {
    await programPage.navigateToDaily();
    await expect(page).toHaveURL(/.*program\/daily/);

    await programPage.navigateToSteps();
    await expect(page).toHaveURL(/.*program\/steps/);
  });

  test('should navigate between all tabs without errors', async ({ page }) => {
    const tabs = ['steps', 'daily', 'prayers', 'literature', 'meetings'] as const;

    for (const tab of tabs) {
      await programPage.navigateToTab(tab);
      await expect(page).toHaveURL(new RegExp(`.*program/${tab}`));
      await programPage.expectNoErrors();
    }
  });
});
