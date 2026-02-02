import { test, expect } from '@playwright/test';
import { PrayersPage } from '../../pages';
import { TEST_PRAYERS } from '../../fixtures/test-data';

test.describe('Program Prayers', () => {
  let prayersPage: PrayersPage;

  test.beforeEach(async ({ page }) => {
    prayersPage = new PrayersPage(page);
    await prayersPage.goto();
  });

  test('should display filters and list', async () => {
    await prayersPage.expectOnPrayersPage();
    await expect(prayersPage.filterAll).toBeVisible();
    await expect(prayersPage.filterFavorites).toBeVisible();
    await expect(prayersPage.filterStep).toBeVisible();
    await expect(prayersPage.filterCommon).toBeVisible();
  });

  test('should render seeded prayers', async () => {
    await expect(prayersPage.getPrayerCard(TEST_PRAYERS.step.id)).toBeVisible();
    await expect(prayersPage.getPrayerCard(TEST_PRAYERS.common.id)).toBeVisible();
  });

  test('should show empty state for favorites filter', async ({ page }) => {
    await prayersPage.selectFilter('favorites');
    await expect(page.getByText('No favorite prayers yet', { exact: false })).toBeVisible();
  });

  test('should filter to step prayers', async () => {
    await prayersPage.selectFilter('step');
    await expect(prayersPage.getPrayerCard(TEST_PRAYERS.step.id)).toBeVisible();
    await expect(prayersPage.getPrayerCard(TEST_PRAYERS.common.id)).toHaveCount(0);
  });
});
