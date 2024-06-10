const ImageTypes = ["image/png", "image/jpeg", "image/jpg"];
const FontTypes = ["font/ttf", "font/otf"];
const ZipTypes = ["application/x-zip-compressed", "application/zip"];

import mime from "mime";

export function isImageFile(file: File): boolean {
  const type: string | null = mime.getType(file.name);
  return type !== null && ImageTypes.includes(type);
}

export function isFontFile(file: File): boolean {
  const type: string | null = mime.getType(file.name);
  return type !== null && FontTypes.includes(type);
}

export function isMediaFile(file: File): boolean {
  return isImageFile(file) || isFontFile(file);
}

export function isZipFile(file: File): boolean {
  const type: string | null = mime.getType(file.name);
  return type != null && ZipTypes.includes(type);
}

export function isValidFile(file: File): boolean {
  return isImageFile(file) || isFontFile(file) || isZipFile(file);
}

import MediaConverter from "./MediaConverter";
import { MediaFile } from "./types";

const converter = new MediaConverter("/convert");

const MAX_IMAGE_DIM = 0x400;
const MIN_IMAGE_DIM = 0x003;

export async function validateTexture(file: MediaFile): Promise<boolean> {
  try {
    const image = await createImageBitmap(file.data);

    if (image.width > MAX_IMAGE_DIM || image.height > MAX_IMAGE_DIM)
      return false;
    else if (image.width < MIN_IMAGE_DIM || image.height < MIN_IMAGE_DIM)
      return false;
    else return true;
  } catch (exception) {
    throw Error(`Texture '${file.filepath}' is invalid.`);
  }
}

export async function validateFont(file: MediaFile): Promise<boolean> {
  try {
    const font = new FontFace("test", await file.data.arrayBuffer());
    await font.load();

    return true;
  } catch (exception) {
    throw Error(`Font '${file.filepath}' is invalid.`);
  }
}

export async function validate(file: MediaFile): Promise<boolean> {
  const type: string | null = mime.getType(file.filepath);

  if (type === null) return false;

  if (ImageTypes.includes(type)) {
    if (!(await validateTexture(file)))
      throw Error(`Texture '${file.filepath}' dimensions invalid.`);
    else return true;
  }

  if (FontTypes.includes(type)) {
    return await validateFont(file);
  }

  return false;
}

export async function convertFiles(
  files: Array<File>
): Promise<Array<MediaFile>> {
  if (files.length === 0) return Array<MediaFile>();

  return await converter.convert(
    files.map((file: File) => ({ filepath: file.name, data: file }))
  );
}
