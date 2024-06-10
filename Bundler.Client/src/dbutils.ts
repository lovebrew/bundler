import localforage from "localforage";
import { BundlerCacheItem } from "./services/types";

class Botanist {
    private storage: LocalForage;
    private isReady: boolean = false;

    constructor(name: string, storeName: string) {
        this.storage = localforage.createInstance({
            name,
            storeName,
            driver: localforage.INDEXEDDB,
        });
    }

    private async checkTimestamps(): Promise<void> {
        if (this.isReady) return;

        const currentTime = Date.now();

        if (await this.storage.length() === 0) return;

        const keys = await this.storage.keys();

        for (const key of keys) {
            const item: BundlerCacheItem | null = await this.storage.getItem(key);

            if (item !== null && item.timestamp < currentTime) {
                await this.storage.removeItem(key);
            }
        }

        this.isReady = true;
    }

    public async getItem(key: string): Promise<any | null> {
        if (!this.isReady) await this.checkTimestamps();
        return await this.storage.getItem(key);
    }

    public async setItem(key: string, value: BundlerCacheItem): Promise<void> {
        await this.storage.setItem(key, value);
    }
};

export const binariesCache = new Botanist("bundler", "binaryCache");
export const assetsCache = new Botanist("bundler", "assetCache");
