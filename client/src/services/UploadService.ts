import { UploadError } from "@/enums/error";
import { Bundle } from "@classes/Bundle";
import { Asset } from "@classes/Asset";
import { processBundle } from "@services/CompileService";
import { processAssetFiles } from "@services/ConvertService";

async function filterResults(
  files: Array<File>,
): Promise<[Array<Bundle>, Array<Asset>]> {
  const bundles = new Array<Bundle>();
  const assets = new Array<Asset>();

  for (const file of files) {
    if (await Bundle.isValid(file)) {
      bundles.push(new Bundle(file));
    } else if (await Asset.isValid(file)) {
      assets.push(await Asset.from(file));
    }
  }

  return [bundles, assets];
}

/**
 * Handles the upload of game files by filtering the input files into bundles and assets,
 * then processing them accordingly. Rejects the upload if both bundles and assets are present,
 * or if there are multiple bundles.
 *
 * @param files - An array of `File` objects to be uploaded.
 * @returns A `Promise<Response>` that resolves with the result of processing the files,
 *          or rejects with `UploadError.FileUploadFailed` if the upload conditions are not met.
 */
export async function handleUpload(files: Array<File>): Promise<Blob> {
  const [bundles, assets] = await filterResults(files);
  if ((bundles.length && assets.length) || bundles.length > 1) {
    throw UploadError.FileUploadFailed;
  }

  if (bundles.length) {
    return processBundle(bundles[0]);
  }
  return processAssetFiles(assets);
}
