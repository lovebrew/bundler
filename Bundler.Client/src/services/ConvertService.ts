import { database } from "@/src/dbutils";
import { getMIMEFromFile, validateTexture } from "@/src/utility";
import { fontMimes, imageMimes } from "@/src/types";
import { BundlerError, ConvertError } from "@/src/error";

async function validateFont(file: File): Promise<void> {
  try {
    const face = new FontFace("test", await file.arrayBuffer());
    await face.load();
  } catch (exception) {
    const log = [`Font '${file.name}' validation failed:`];
    log.push(`  - ${(exception as Error).message}`);
    console.error(log.join("\n"));

    throw new BundlerError(ConvertError.InvalidFont);
  }
}

async function getConvertedName(file: File) {
  const mime = await getMIMEFromFile(file);
  if (!mime) throw new Error("no mime detected");

  const name = file.name.substring(0, file.name.indexOf("."));
  if (imageMimes.includes(mime)) {
    return `${name}.t3x`;
  }
  return `${name}.bcfnt`;
}

async function validateFiles(files: Array<File>) {
  await Promise.all(
    files.map(async (file: File) => {
      const mime = await getMIMEFromFile(file);
      if (!mime) throw Error("invalid mime");

      if (fontMimes.includes(mime)) {
        await validateFont(file);
      } else {
        const blob = new Blob([await file.arrayBuffer()]);
        const [valid, message] = await validateTexture(blob);

        if (!valid && message) {
          const log = [`Texture '${file.name}' validation failed:`];
          log.push(`  - ${message}`);
          console.error(log.join("\n"));

          throw new BundlerError(ConvertError.InvalidTexture);
        }
      }
    })
  );
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
  await validateFiles(files);

  const formdata = new FormData();

  const results: Array<File> = [];
  const uncached = new Map<string, File>();

  for (const file of files) {
    const blob = new Blob([await file.arrayBuffer()]);
    const item = await database.getItem(file);

    if (item) {
      results.push(item.file);
      continue;
    }

    uncached.set(await getConvertedName(file), file);
    formdata.append(file.name, blob, file.name);
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

    return results;
  } catch (exception) {
    console.log(exception);
    throw new BundlerError(ConvertError.FailedRequest);
  }
};
