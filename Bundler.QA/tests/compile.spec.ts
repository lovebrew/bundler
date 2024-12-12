import { test, expect } from '@playwright/test';

import { IndexPage } from '../pages';

test.describe('Compiling Binaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
});
