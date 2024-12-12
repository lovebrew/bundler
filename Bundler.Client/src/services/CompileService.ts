import Bundle from "@/src/classes/Bundle";
// import { database } from "@/src/dbutils";
import { BundlerError, CompileError } from "@/src/error";
import {
  BundleBinaries,
  Console,
  extensions,
  iconExtensions,
} from "@/src/types";
import { database } from "@/src/dbutils";

/**
 * Asynchronously compiles binaries for a given bundle by leveraging caching and
 * a remote compilation service. If binaries are already cached locally, they
 * are used directly; otherwise, the function submits a request to compile the
 * required binaries remotely.
 *
 * @param bundle - The `Bundle` instance containing metadata, targets, and icons
 *                 required for compilation.
 * @returns A promise that resolves to a `BundleBinaries` object, where each key
 *          is a target console and the value is a `Blob` representing the compiled
 *          binary.
 *
 * ### Workflow:
 * 1. Retrieves target consoles, metadata, and icons from the bundle.
 * 2. Checks the local cache for each target's binary:
 *    - If found, uses the cached binary and skips further processing for that target.
 *    - If not found, gathers necessary data (e.g., icons) for the compilation request.
 * 3. Sends a POST request to a remote compilation service with the metadata, targets,
 *    and icons as form data.
 * 4. Processes the response, decoding and caching the compiled binaries for future use.
 * 5. Returns the compiled binaries as a `BundleBinaries` object.
 *
 * ### Errors:
 * - Throws a `BundlerError` with `CompileError.FailedRequest` if the remote request fails.
 *
 */
export const compileFromBundle = async (
  bundle: Bundle
): Promise<BundleBinaries> => {
  const targets = [...bundle.getTargets()];
  const metadata = bundle.getDetails();
  const icons = bundle.getIcons();

  const result: BundleBinaries = {};
  const hashes = new Map<string, string>();

  const formdata = new FormData();

  for (const console of targets) {
    /* check if the console binary is cached */
    const key = await bundle.calculateIndexHash(console);
    hashes.set(console, key);

    const item = await database.getItem(key);

    if (item) {
      result[console] = item.file;
      /* remove the target since it was cached */
      targets.splice(targets.indexOf(console), 1);
      continue;
    }

    /* if not, we grab the icon data for it */
    const icon = icons[console] as Blob;

    if (icon) {
      const basename = `icon-${console}`;
      formdata.append(basename, icon, `${basename}.${iconExtensions[console]}`);
    }
  }

  const url = process.env.COMPILE_URL as string;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(metadata)) {
    query.append(key, value as string);
  }
  query.append("targets", targets.join(","));

  try {
    const response = await fetch(`${url}?${query.toString()}`, {
      method: "POST",
      body: formdata,
    });

    const json = await response.json();

    for (const [key, value] of Object.entries(json)) {
      if (key === "log") continue;
      const index = key as Console;

      const decoded = await fetch(`data:file/${key};base64,${value}`);

      const blob = await decoded.blob();
      const file = new File([blob], `${metadata.title}.${extensions[index]}`);

      result[index] = file;
      const keyable = hashes.get(index);

      if (keyable) {
        await database.setItem(file, keyable);
      } else {
        console.error(`Failed to cache ${file.name}`);
      }
    }

    return result;
  } catch {
    throw new BundlerError(CompileError.FailedRequest);
  }
};
