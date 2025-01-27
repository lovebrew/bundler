import Dexie from "dexie";
import MurmurHash3 from "imurmurhash";

export type CachedItem = {
  file: File;
  expiration: number;
};

class BundlerDatabase extends Dexie {
  cache: Dexie.Table<CachedItem, string>;
  initialized = false;

  constructor() {
    super("Bundler");

    this.version(1).stores({
      cache: ",hash",
    });

    this.cache = this.table("cache");
  }

  private calculateExpiryDate(): number {
    const today = new Date();
    const expiration = new Date(today.setDate(today.getDate() + 3));

    return expiration.valueOf();
  }

  private async calculateHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();

    const encoded: string = await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(new Blob([buffer]));
    });

    const hash = MurmurHash3(encoded.slice(encoded.indexOf(",") + 1));
    return hash.result().toString();
  }

  async setItem(file: File, keyable: File | string): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
        this.initialized = true;
      }

      const item = { file, expiration: this.calculateExpiryDate() };
      let key: string;

      if (keyable instanceof File) key = await this.calculateHash(keyable);
      else key = keyable;

      this.cache.put(item, key);
    } catch (exception) {
      console.error(exception);
    }
  }

  async getItem(index: File | string): Promise<CachedItem | undefined> {
    if (!this.initialized) {
      await this.initialize();
      this.initialized = true;
    }

    let key;
    if (index instanceof File) key = await this.calculateHash(index);
    else key = index;

    return await this.cache.get(key);
  }

  async checkRemoveItems() {
    const today = new Date().valueOf();

    await this.transaction("rw", this.cache, () => {
      this.cache.toCollection().each((item, cursor) => {
        if (item.expiration < today) this.cache.delete(cursor.primaryKey);
      });
    });
  }

  async initialize() {
    try {
      await this.open();
      await this.checkRemoveItems();
    } catch (error) {
      console.error("Error initializing the database:", error);
    }
  }
}

export const database = new BundlerDatabase();
