import { Injectable } from '@angular/core';

import { Dexie } from 'dexie';
import fnv from 'fnv-plus';

export type CacheEntry = {
  blob: Blob;
  name: string;
  timestamp: number;
};

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService extends Dexie {
  #cache!: Dexie.Table<CacheEntry, string>;

  constructor() {
    super('Bundler');
    this.version(1).stores({
      cache: ',timestamp',
    });
    this.#cache = this.table('cache');
    this.on('ready', async () => {
      await this.cleanup(7).catch((e) => console.warn('IndexedDbService cleanup failed', e));
    });
  }

  private async hash(key: Blob | string): Promise<string> {
    const text = key instanceof Blob ? await key.text() : key;
    return fnv.hash(text).hex();
  }

  private async cleanup(days: number) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    await this.#cache.where('timestamp').below(cutoff).delete();
  }

  basename(filepath: string): string {
    return filepath.split('/').pop()!;
  }

  async get(key: Blob | string, filepath: string): Promise<File | undefined> {
    if (!key) return undefined;
    const filehash = await this.hash(key);
    const entry = await this.#cache.get(filehash);
    if (!entry) return undefined;
    return new File([entry.blob], filepath);
  }

  async set(key: Blob | string, blob: Blob, filepath: string): Promise<void> {
    if (!key) return undefined;
    const timestamp = Date.now();
    const hash = await this.hash(key);
    const name = this.basename(filepath);
    await this.#cache.put({ blob, name, timestamp }, hash);
  }
}
