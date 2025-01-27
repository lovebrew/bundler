import { database } from "@/src/dbutils";
import { BundlerError, ConvertError } from "@/src/error";
import { loadTexture, Texture } from "@/src/classes/Texture";
import { loadFont, Font } from "@/src/classes/Font";
import { logError } from "./LoggingService";

export type ConvertibleFile = Texture | Font;

async function validateFiles(files: Array<File>) {
  const errors = Array<string>();
  const validFiles = Array<ConvertibleFile>();

  await Promise.all(
    files.map(async (file: File) => {
      // Try texture first
      const [texture, textureError] = await loadTexture(file);

      if (texture) {
        validFiles.push(texture);
        return; // Skip font check if it's a valid texture
      }

      // Only try font if texture validation returned undefined without an error
      // (textureError being defined means it was a texture but invalid)
      if (!textureError) {
        const font = await loadFont(file);
        if (font) {
          validFiles.push(font);
          return;
        }
        errors.push(`Invalid file format: ${file.name} (not a valid texture or font)`);
      } else {
        errors.push(`Invalid texture: ${file.name} - ${textureError}`);
      }
    })
  );

  if (errors.length > 0) {
    logError("File Validation", errors);
  }

  return validFiles;
}

/**
 * Converts an array of files by validating their MIME types and processing them
 * through a remote conversion service if they are not already cached.
 *
 * @param files - An array of `File` objects to be validated, cached, or converted.
 * @returns A promise that resolves to an array of `File` objects, containing either:
 *          - The original files (if cached or unchanged).
 *          - Converted files received from the remote service.
 *
 * ### Workflow:
 * 1. **Validation**:
 *    - Determines the MIME type of each file.
 *    - For font files (e.g., MIME types in `fontMimes`), validates the font.
 *    - For other files, validates them as images with a maximum dimension of 1024 pixels.
 * 2. **Caching**:
 *    - Checks if each file is cached locally.
 *    - If cached, skips the remote conversion and adds the cached file to the results.
 * 3. **Remote Conversion**:
 *    - Uncached files are sent to a remote conversion service using a POST request.
 *    - The response is processed, decoding and storing the converted files locally.
 *    - Converted files are added to the results array.
 * 4. Returns the final array of files (either cached, validated, or converted).
 *
 * ### Errors:
 * - Throws an error if the MIME type of a file is invalid or cannot be determined.
 * - Throws a `BundlerError` with `ConvertError.FailedConvert` if the remote conversion request fails.
 *
 */
export const convertFiles = async (
  files: Array<File>
): Promise<Array<File>> => {
  const data = await validateFiles(files);

  if (data.length === 0) {
    throw new BundlerError(ConvertError.InvalidFilesUploaded);
  }

  const formdata = new FormData();

  const results: Array<File> = [];
  const uncached = new Map<string, File>();

  for (const file of data) {
    const blob = new Blob([await file.arrayBuffer()]);
    const item = await database.getItem(file.file);

    if (item) {
      results.push(item.file);
      continue;
    }

    uncached.set(file.filename, file.file);
    formdata.append(file.file.name, blob, file.file.name);
  }

  if (uncached.size === 0) {
    return results;
  }

  try {
    const response = await fetch(process.env.CONVERT_URL as string, {
      method: "POST",
      body: formdata,
    });

    const json = await response.json();

    if (response.ok) {
      for (const [key, value] of Object.entries(json)) {
        if (key === "log") continue;

        const decoded = await fetch(`data:octet/stream;base64,${value}`);
        const file = new File([await decoded.blob()], key);

        results.push(file);
        const keyable = uncached.get(key);

        if (keyable) {
          await database.setItem(file, keyable);
        } else {
          console.error(`Failed to cache ${key}`);
        }
      }

      if ("log" in json) {
        results.push(new File([json["log"]], "convert.log"));
      }
    }
  } catch {
    throw new BundlerError(ConvertError.FailedRequest);
  }

  return results;
};
