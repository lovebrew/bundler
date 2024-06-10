import localforage from "localforage"

export const binariesCache = localforage.createInstance({
    name: "bundler",
    storeName: "binaryCache",
    driver: localforage.INDEXEDDB,
});

export const assetsCache = localforage.createInstance({
    name: "bundler",
    storeName: "assetCache",
    driver: localforage.INDEXEDDB,
});

export const timestampsCache = localforage.createInstance({
    name: "bundler",
    storeName: "timestampCache",
    driver: localforage.INDEXEDDB,
});
