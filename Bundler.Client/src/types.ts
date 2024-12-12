export type Console = "ctr" | "hac" | "cafe";

export const extensions: Record<Console, string> = {
  ctr: "3dsx",
  hac: "nro",
  cafe: "wuhb",
};

export const iconExtensions: Record<Console, string> = {
  ctr: "png",
  hac: "jpg",
  cafe: "png",
};

export type BundleIcons = {
  [key in Console]?: Blob;
};

export type BundleBinaries = {
  [key in Console]?: File;
};

export const zipMimes: Array<string> = ["application/zip"];
export const imageMimes: Array<string> = ["image/jpeg", "image/png"];
export const fontMimes: Array<string> = ["font/ttf", "font/otf"];

export const ALLOWED_MIMES: Array<string> = zipMimes
  .concat(imageMimes)
  .concat(fontMimes);
