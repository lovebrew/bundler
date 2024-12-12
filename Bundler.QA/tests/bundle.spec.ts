import { test, expect } from '@playwright/test';

import { IndexPage } from '../pages';

test.describe('Validating Bundle Uploads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
});
