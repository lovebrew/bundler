import { fileTypeFromBuffer } from "file-type";

export class Asset {
  static AllowedTypes: Array<string> = ["image/png", "image/jpeg", "image/jpg", "font/otf", "font/ttf"];

  public static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    if (!result || !Asset.AllowedTypes.includes(result.mime)) {
      return false;
    }
    return true;
  }
}
