import { test, expect } from '@playwright/test';
import path from 'path';

import { ZipFile } from '../../classes/zip';
import { IndexPage } from '../../pages';


test.describe('Validating Font Uploads', () => {
  let index: IndexPage;

  test.beforeEach(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');

    index = new IndexPage(page);
  });

  test.afterEach(async () => {
    await index.close();
  });

  test('Users should be able to upload multiple valid fonts', async () => {
    const files = ['oneday.otf', 'roboto.ttf'];

    await test.step('Upload a font', async () => {
      await index.uploadLocalFiles(files);
    });

    await test.step('Validate toast message', async () => {
      const message = await index.getToastMessage('success');
      expect(message).toBe('Downloaded.');
      await index.waitForToastDismiss('success');
    });

    await test.step('Validate zip contents', async () => {
      const download = index.getLatestDownload();
      const zip = new ZipFile(download);

      expect((await zip.getEntries()).length).toBe(2);

      for (const filename of files) {
        const basename = path.basename(filename, path.extname(filename));
        expect(await zip.getEntry(`${basename}.bcfnt`)).toBeTruthy();
      };
    });
  });
});
