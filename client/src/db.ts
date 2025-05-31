import Dexie from 'dexie';
import EntityTable from 'dexie';
import { x64 } from 'murmurhash3js';

interface CachedItem {
  file: File;
  expiration: number;
}

const database = new Dexie('Bundler') as Dexie & {
  cache: EntityTable<string, CachedItem>;
};

database.version(1).stores({
  cache: ',hash'
});

database.on('ready', async () => {
  const today = new Date().valueOf();

  await database.transaction('rw', database.cache, () => {
    database.cache
      .toCollection()
      .each((item: CachedItem, cursor: IDBCursor) => {
        if (item.expiration < today) database.cache.delete(cursor.primaryKey);
      });
  });
});

function calculateExpiryDate(): number {
  const today = new Date();
  const expiration = new Date(today.setDate(today.getDate() + 3));

  return expiration.valueOf();
}

async function calculateHash(file: File) {
  const buffer = await file.arrayBuffer();

  const encoded: string = await new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(new Blob([buffer]));
  });

  const hash = x64.hash128(encoded.slice(encoded.indexOf(',') + 1));
  return hash;
}

export async function getDatabaseItem(
  index: File | string
): Promise<CachedItem | undefined> {
  let key;
  if (index instanceof File) key = await calculateHash(index);
  else key = index;

  return await database.cache.get(key);
}

export async function setDatabaseItem(
  file: File,
  keyable: File | string
): Promise<void> {
  try {
    const item = { file, expiration: calculateExpiryDate() };
    let key: string;

    if (keyable instanceof File) key = await calculateHash(keyable);
    else key = keyable;

    database.cache.put(item, key);
  } catch (exception) {
    console.error(exception);
  }
}

/** Queries available disk quota.
  @see https://developer.mozilla.org/en-US/docs/Web/API/StorageEstimate
  @returns {Promise<{quota: number, usage: number}>} Promise resolved with
  {quota: number, usage: number} or undefined.
*/
export async function getEstimatedQuota(): Promise<
  StorageEstimate | undefined
> {
  return navigator.storage && navigator.storage.estimate
    ? await navigator.storage.estimate()
    : undefined;
}

export type { CachedItem };
