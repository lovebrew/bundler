import { Asset } from "@/classes/Asset";
import { API_URL } from "@/config";
import { ConvertError } from "@/enums/error";

/**
 * Processes an array of asset game files by uploading them to a conversion service.
 *
 * This function appends each asset's file to a FormData object and sends it via a POST request
 * to the conversion endpoint. The response is expected to be a ZIP file containing the processed assets.
 * In case of network or CORS errors, the function will return an object with an undefined result.
 *
 * @param assets - An array of `Asset` objects to be processed and converted.
 * @returns A promise that resolves to a `Response` object containing the resulting ZIP file as a Blob,
 *          or undefined if the request fails.
 */
export async function processAssetFiles(assets: Array<Asset>): Promise<Blob> {
  if (!assets.length) {
    throw ConvertError.NoFilesToConvert;
  }

  const body = new FormData();
  assets.forEach((file) => {
    body.append("files", file);
    body.append("paths", file.path);
  });

  const response = await fetch(`${API_URL}/convert`, {
    method: "POST",
    body,
  }).catch(() => null);

  if (!response || !response.ok) {
    throw ConvertError.FailedRequest;
  }

  return response.blob();
}
