import { test, expect } from '@playwright/test';
import path from 'path';

import { ZipFile } from '../../classes/zip';
import { CachedItem, IndexPage, MemoryFile } from '../../pages/index';
import { createImage, ImageFormat, randomString } from '../../utility';


test.describe('Validating Texture Uploads', () => {
  let index: IndexPage;

  test.beforeEach(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/');

    index = new IndexPage(page);
  });

  test.afterEach(async () => {
    await index.close();
  });

  function getInvalidTextureMessage(width: number, height: number) {
    const min = 3;
    const max = 1024;

    if (width > max || width < min) {
      const limit = width > max ? max : min;
      const type = limit === max ? 'limit' : 'min';
      return `Invalid width: ${width} (${type}: ${limit})`;
    }

    if (height > max || height < min) {
      const limit = height > max ? max : min;
      const type = limit === max ? 'limit' : 'min';
      return `Invalid height: ${height} (${type}: ${limit})`;
    }

    throw new Error(
      'Unexpected valid dimensions passed to getInvalidTextureMessage',
    );
  }

  [
    { width: 1025, height: 1024, format: 'png' },
    { width: 1024, height: 1025, format: 'png' },
    { width: 2, height: 3, format: 'png' },
    { width: 3, height: 2, format: 'png' },
    { width: 2, height: 2, format: 'png' },

    { width: 1025, height: 1024, format: 'jpeg' },
    { width: 1024, height: 1025, format: 'jpeg' },
    { width: 2, height: 3, format: 'jpeg' },
    { width: 3, height: 2, format: 'jpeg' },
    { width: 2, height: 2, format: 'jpeg' },
  ].forEach(({ width, height, format }) => {
    test(`Invalid Dimensions: ${format} [${width}x${height}]`, async () => {
      await test.step('Create and upload a texture', async () => {
        const buffer = await createImage(width, height, format as ImageFormat);
        if (!buffer) throw Error('Failed to create Buffer');

        await index.uploadBufferFile('test.png', `image/${format}`, buffer);
      });

      await test.step('Check toast message', async () => {
        const message = await index.getToastMessage('error');
        expect(message).toBe('Invalid file(s) uploaded.');
        await index.waitForToastDismiss('error');
      });

      await test.step('Check console log', async () => {
        const logs = await index.getConsoleLogs();
        const message = getInvalidTextureMessage(width, height);
        expect(logs.some((log) => log.includes(message))).toBeTruthy();
      });
    });
  });

  ['gif', 'webp', 'tiff', 'avif'].forEach((format) => {
    test(`Invalid Format: ${format}`, async () => {
      await test.step('Create and upload a texture', async () => {
        const buffer = await createImage(512, 512, format as ImageFormat);
        if (!buffer) throw Error('Failed to create Buffer');

        await index.uploadBufferFile(`test.${format}`, `image/${format}`, buffer);
      });

      await test.step('Check toast message', async () => {
        const message = await index.getToastMessage('error');
        try {
          expect(message).toBe('File(s) failed to convert.');
        } catch {
          expect(message).toBe("Invalid file(s) uploaded.");
        }
        await index.waitForToastDismiss('error');
      });
    });
  });

  ['png', 'jpeg'].forEach((format) => {
    test(`Corrupt ${format} Data`, async () => {
      await test.step('Create and upload a texture', async () => {
        const buffer = await createImage(512, 512, format as ImageFormat);
        if (!buffer) throw Error('Failed to create Buffer');

        for (let index = 0; index < 0x10; index++) {
          buffer[index] = 0x0;
        }

        await index.uploadBufferFile('test.png', `image/${format}`, buffer);
      });

      await test.step('Check toast message', async () => {
        const message = await index.getToastMessage('error');
        expect(message).toBe('Invalid file(s) uploaded.');
        await index.waitForToastDismiss('error');
      });
    });
  });

  ['png', 'jpeg'].forEach((format) => {
    test(`Users can upload a valid ${format}`, async () => {
      const name = `test.${format}`;

      await test.step('Create and upload a texture', async () => {
        const buffer = await createImage(256, 256, format as ImageFormat);
        if (!buffer) throw Error('Failed to create Buffer');

        await index.uploadBufferFile(name, `image/${format}`, buffer);
      });

      await test.step('Check toast message', async () => {
        const message = await index.getToastMessage('success');
        expect(message).toBe('Downloaded.');
        await index.waitForToastDismiss('success');
      });

      await test.step('Validate downloaded zip', async () => {
        const download = index.getLatestDownload();
        const entry = new ZipFile(download).getEntry('test.t3x');

        expect(entry).toBeTruthy();
      });
    });
  });

  test('Users can upload multiple valid files', async () => {
    const formats = ['png', 'jpeg', 'png', 'jpeg'];
    const buffers: Array<MemoryFile> = [];

    await test.step('Create and upload multiple textures', async () => {
      for (const format of formats) {
        const texture = await createImage(512, 256, format as ImageFormat);
        if (!texture) throw Error('failed to create texture');
        buffers.push({ name: `${randomString()}.${format}`, mimeType: `image/${format}`, buffer: texture });
      }

      await index.uploadBufferFiles(buffers);
    });

    await test.step('Check toast message', async () => {
      const message = await index.getToastMessage('success');
      expect(message).toBe('Downloaded.');
      await index.waitForToastDismiss('success');
    });

    await test.step('Validate downloaded zip', async () => {
      const download = index.getLatestDownload();

      const zip = new ZipFile(download);
      const entries = await zip.getEntries();

      expect(entries.length).toBe(4);

      for (const file of buffers) {
        const basename = path.basename(file.name, path.extname(file.name));
        expect(await zip.getEntry(`${basename}.t3x`)).toBeTruthy();
      }
    });
  });

  test('Users should be informed of invalid texture formats on multiple uploads', async () => {
    const formats = ['png', 'jpeg', 'webp', 'png', 'jpeg', 'gif'];
    const buffers: Array<MemoryFile> = [];

    await test.step('Create and upload multiple textures', async () => {
      for (const format of formats) {
        const texture = await createImage(512, 256, format as ImageFormat);
        if (!texture) throw Error('failed to create texture');
        buffers.push({ name: `${randomString()}.${format}`, mimeType: `image/${format}`, buffer: texture });
      }

      await index.uploadBufferFiles(buffers);
    });

    await test.step('Check toast message', async () => {
      const message = await index.getToastMessage('success');
      expect(message).toBe('Downloaded.');
      await index.waitForToastDismiss('success');
    });

    await test.step('Check console error messages', async () => {
      const files = buffers.filter((file) => file.name.endsWith('.webp') || file.name.endsWith('.gif'));
      const logs = await index.getConsoleLogs();

      for (const file of files) {
        const message = `${file.name}: Invalid file type: ${file.mimeType}`
        expect(logs.some((log) => log.includes(message))).toBeTruthy();
      }
    });
  });

  test('Uploaded textures should be cached in IndexedDB', async () => {
    const texture = await test.step('Create and upload a texture', async () => {
      const texture = await createImage(256, 256, 'png' as ImageFormat);
      if (!texture) throw Error('failed to create texture');
      index.uploadBufferFile('test.png', 'image/png', texture);
      return texture;
    });

    await test.step('Check toast message', async () => {
      const message = await index.getToastMessage('success');
      expect(message).toBe('Downloaded.');
      await index.waitForToastDismiss('success');
    });

    await test.step('Check database for cache', async () => {
      const item: CachedItem = await index.getIndexedDBItem(texture);
      expect(item).toBeTruthy();
    });
  });
});
