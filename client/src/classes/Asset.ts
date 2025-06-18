import { fileTypeFromBuffer } from "file-type";
import { dirname } from "path";

export class Asset extends File {
  static AllowedTypes: Array<string> = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "font/otf",
    "font/ttf",
  ];

  constructor(blob: BlobPart[], filename: string) {
    super(blob, filename);
  }

  public get path() {
    return this.name.substring(0, this.name.lastIndexOf("/"));
  }

  public static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    return result !== undefined && Asset.AllowedTypes.includes(result.mime);
  }

  public static async from(file: File): Promise<Asset> {
    const blob = await file.arrayBuffer();
    return new Asset([blob], file.name);
  }
}
