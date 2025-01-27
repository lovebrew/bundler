import { Page } from '@playwright/test';
import MurmurHash3 from 'imurmurhash';
import path from 'path';

import { config } from '../config';


export type MemoryFile = {
  name: string,
  mimeType: string,
  buffer: Buffer
};

export type CachedItem = {
  blob: Blob,
  expiration: number
};

export class IndexPage {
  readonly page: Page;

  readonly fileInput = '#fileUpload';
  readonly toasts = {
    success: '[class*="bg-green-600"]',
    error: '[class*="bg-red-600"]',
  };

  logs: Array<string> = [];
  downloads: Array<string> = [];

  constructor(page: Page) {
    this.page = page;

    this.page.on('console', (message) => {
      this.logs.push(message.text());
    });

    this.page.on('download', async (download) => {
      const path = await download.path();
      this.downloads.push(path);
    });
  }

  public async close() {
    await this.page.close();
  }

  /**
   * Uploads a local file to the file input element.
   *
   * This method resolves the full path of the given file, constructs it
   * relative to the resources directory, and uploads it to the file input field
   * on the page.
   *
   * @param filepath - The relative path to the file inside the resources directory.
   *
   * @throws Error if the file does not exist or the upload fails.
   */
  public async uploadLocalFile(filepath: string): Promise<void> {
    const fullPath = path.resolve(config.resourcesDir, filepath);
    await this.page.locator(this.fileInput).setInputFiles(fullPath);
  }

  public async uploadLocalFiles(filepaths: Array<string>): Promise<void> {
    const files = filepaths.map((p) => path.resolve(config.resourcesDir, p));
    await this.page.locator(this.fileInput).setInputFiles(files);
  }

  /**
   * Uploads a file from a buffer to the file input element.
   *
   * This method allows uploading a file from a buffer. It requires the file's name,
   * MIME type, and buffer data. The file is uploaded to the file input field on the page.
   *
   * @param name - The name of the file being uploaded.
   * @param mimeType - The MIME type of the file being uploaded (e.g., 'image/png').
   * @param buffer - The buffer containing the file's content.
   *
   * @throws Error if the buffer is null or undefined.
   * @throws Error if the file upload fails.
   */
  public async uploadBufferFile(
    name: string,
    mimeType: string,
    buffer: Buffer | undefined,
  ): Promise<void> {
    if (!buffer) throw Error('Buffer is required.');

    const file = { name, mimeType, buffer };
    await this.page.locator(this.fileInput).setInputFiles(file);
  }

  public async uploadBufferFiles(buffers: Array<MemoryFile>): Promise<void> {
    await this.page.locator(this.fileInput).setInputFiles(buffers);
  }

  /**
   * Gets the latest downloaded file.
   *
   * @returns The path to the downloaded file.
   */
  public getLatestDownload(): string {
    return this.downloads[0];
  }

  public async getIndexedDBItem(buffer: Buffer): Promise<CachedItem> {
    const key = MurmurHash3(buffer.toString('base64')).result().toString();

    return await this.page.evaluate(async (key) => {
      const openDB = () =>
        new Promise((resolve, reject) => {
          const request = window.indexedDB.open('Bundler');
          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (event) => reject(event.target.error);
         });

       const db = await openDB();

       const fetchItem = () =>
         new Promise((resolve, reject) => {
           const transaction = db.transaction(['cache'], 'readonly');
           const store = transaction.objectStore('cache');
           const itemRequest = store.get(key);

           itemRequest.onsuccess = (event) => resolve(event.target.result);
           itemRequest.onerror = (event) => reject(event.target.error);
         });

       return await fetchItem() as CachedItem;
    }, key);
  }

  /**
   * Retrieves the message displayed in the toast notification.
   *
   * This method checks for the visibility of both success and error toast messages
   * and returns the message text. If no toast is visible, it throws an error.
   *
   * @returns The text content of the visible toast message.
   *
   * @throws Error if no toast message is visible.
   */
  public async getToastMessage(
    type: 'success' | 'error',
  ): Promise<string | null> {
    const toast = this.page.locator(this.toasts[type]);
    return await toast.textContent();
  }

  public async waitForToastDismiss(type: 'success' | 'error') {
    const toast = this.page.locator(this.toasts[type]);
    await toast.waitFor({ state: 'hidden' });
  }

  public async getConsoleLogs(): Promise<Array<string>> {
    return this.logs;
  }
}
