import { test, expect } from '@playwright/test';
import { MeetingsPage } from '../../pages';
import { TEST_MEETINGS } from '../../fixtures/test-data';

test.describe('Program Meetings', () => {
  let meetingsPage: MeetingsPage;

  test.beforeEach(async ({ page }) => {
    meetingsPage = new MeetingsPage(page);
    await meetingsPage.goto();
  });

  test('should display calendar and seeded meeting', async ({ page }) => {
    await meetingsPage.expectOnMeetingsPage();
    await expect(meetingsPage.getMeetingItem(TEST_MEETINGS.today.id)).toBeVisible();
    await expect(page.getByText(TEST_MEETINGS.today.name)).toBeVisible();
  });

  test('should open day detail sheet for today', async ({ page }) => {
    const today = new Date().getDate();
    await meetingsPage.getCalendarDay(today).click();
    await expect(page.getByText('Log Meeting')).toBeVisible();
  });
});
