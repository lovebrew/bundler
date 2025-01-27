import { ALLOWED_MIMES } from "@/src/types";

import { fileTypeFromBuffer } from "file-type";
import Bundle from "@/src/classes/Bundle";

export function format(
  template: string,
  params?: { [key: string]: string }
): string {
  if (!params) return template;
  return template.replace(/{(\w+)}/g, (match, key) => {
    return key in params ? params[key] : match;
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1]);
      } else {
        reject(new Error("Failed to convert Blob to Base64"));
      }
    };

    reader.onerror = () => reject(new Error("FileReader encountered an error"));
    reader.readAsDataURL(blob);
  });
}

const CTR_DIMS_MAX = 1024;
const CTR_DIMS_MIN = 3; // "because 3 was expanded to 4" - Nawias

async function validateImage(
  data: Blob,
  min: number,
  max: number = min
): Promise<[boolean, string | undefined]> {
  try {
    const image = await createImageBitmap(data);

    if (image.width > max || image.width < min) {
      const limit = image.width >= max ? CTR_DIMS_MAX : CTR_DIMS_MIN;
      const type = limit === CTR_DIMS_MAX ? "limit" : "min";

      return [false, `Invalid width: ${image.width} (${type}: ${limit})`];
    }

    if (image.height > max || image.height < min) {
      const limit = image.height >= max ? CTR_DIMS_MAX : CTR_DIMS_MIN;
      const type = limit === CTR_DIMS_MAX ? "limit" : "min";

      return [false, `Invalid height: ${image.height} (${type}: ${limit})`];
    }
  } catch (exception) {
    throw new Error((exception as Error).message);
  }

  return [true, undefined];
}

export async function validateTexture(texture: Blob) {
  return await validateImage(texture, CTR_DIMS_MIN, CTR_DIMS_MAX);
}
export async function validateIcon(icon: Blob, size: number) {
  return await validateImage(icon, size);
}

export async function getMIMEFromFile(file: File): Promise<string | null> {
  const result = await fileTypeFromBuffer(await file.arrayBuffer());
  return result !== undefined ? result.mime : null;
}

export async function isValidFile(file: File): Promise<boolean> {
  const result = await getMIMEFromFile(file);
  if (file.name == Bundle.CONFIG_NAME) return true;
  return result !== null && ALLOWED_MIMES.includes(result);
}

export function calculateExpiryDate(): number {
  const today = new Date();
  const expiration = new Date(today.setDate(today.getDate() + 3));

  return expiration.valueOf();
}
