import { Bundle } from "@/classes/Bundle";
import { CompileError } from "@/enums/error";
import { API_URL } from "@/config";
import { processAssetFiles } from "@services/ConvertService";
import { Target } from "@/enums/target";

import { ZipReader, BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import { Zipfile } from '@/classes/Zipfile';
import { ExportData } from '@/types';
import { Asset } from '@/classes/Asset';

const LOG_REGEX = new RegExp("\.log$");

/**
 * Zips game files and asset entries into a single zip archive.
 *
 * If `assets` is an array of `Asset` or `File`, they are combined with `source` and added to the archive directly.
 * If `assets` is a `Blob` representing a zip archive, its contents are extracted. Files matching `LOG_REGEX`
 * are separated out and returned separately, while all others are added to the zip along with `source`.
 *
 * @param {Array<File>} source - Files to be included in the zip (always included).
 * @param {Array<Asset> | Blob} assets - Either:
 *   - An array of asset files to include directly, or
 *   - A ZIP Blob containing additional files to extract and merge.
 *
 * @returns {Promise<[Blob, Blob?]>} - A tuple:
 *   - The first item is the final zip Blob.
 *   - The second item (optional) is a `Blob` representing a log file (if one matched `LOG_REGEX`).
 */
async function zipGameFiles(
  source: Array<File>,
  assets: Array<Asset> | Blob,
): Promise<[Blob, Blob?]> {
  const result = new ZipWriter(new BlobWriter("application/zip"));

  if (Array.isArray(assets)) {
    await Promise.all(
      source
        .concat(assets).map(async (file) => {
          const reader = new BlobReader(file);
          await result.add(file.name, reader);
        })
    );
    return [await result.close()];
  }

  const zip = new ZipReader(new BlobReader(assets));
  const entries = await zip.getEntries().catch(() => []);

  const [sources, blobs] = await Promise.all(
    [
      Promise.all(source.map(async (file) => ({
        name: file.name,
        blob: file as Blob
      }))),
      Promise.all(entries
        .filter((e) => e.getData)
        .map(async (entry) => ({
          name: entry.filename,
          blob: await entry.getData!(new BlobWriter)
        })))
    ]
  );

  const log = blobs.find((file) => LOG_REGEX.test(file.name));
  const files = sources.concat(blobs.filter((b) => b !== log));

  await Promise.all(
    files.map(async (file) => {
      const reader = new BlobReader(file.blob);
      await result.add(file.name, reader);
    })
  );
  return [await result.close(), log?.blob];
}

/**
 * Processes a Bundle by loading its contents, extracting icons, and sending them to the compile API.
 *
 * @param bundle - The Bundle instance to process and compile.
 * @returns A promise that resolves to a Blob containing the compiled result.
 * @throws {CompileError.FailedRequest} If the network request fails or the response is not OK.
 */
export async function processBundle(bundle: Bundle): Promise<Blob> {
  await bundle.load();

  const icon = bundle.getIcon();
  const body = bundle.formData;

  await bundle.dispose();

  if (icon) body?.append("icon", icon);

  const response = await fetch(`${API_URL}/compile`, {
    method: "POST",
    body,
  }).catch(() => null);

  if (!response || !response.ok) {
    throw CompileError.FailedRequest;
  }

  const responseBlob = await response.blob();
  const [source, assets] = bundle.getAssets();

  let exported: ExportData = {} as ExportData;
  [exported.default] = await zipGameFiles(source, assets);
  if (bundle.getTargets().includes(Target.Ctr) && assets.length) {
    const converted = await processAssetFiles(assets);
    [exported.ctr, exported.log] = await zipGameFiles(source, converted);
  }

  const zip = new ZipReader(new BlobReader(responseBlob));
  const binaries = await zip.getEntries().catch(() => []);

  const result = new Zipfile(binaries, exported);
  await result.fuseGameFiles(bundle.package);

  return await result.close();
}
