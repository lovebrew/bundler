import { fileTypeFromBuffer } from 'file-type';

const MimeToExt: Record<string, string> = {
  'image/png': 't3x',
  'image/jpeg': 't3x',
  'image/jpg': 't3x',
  'font/otf': 'bcfnt',
  'font/ttf': 'bcfnt',
};

export class Asset extends File {
  constructor(
    blob: BlobPart[],
    filename: string,
    public mime: string,
  ) {
    super(blob, filename);
  }

  get parent(): string {
    return this.name.substring(0, this.name.lastIndexOf('/'));
  }

  get stem(): string {
    return this.name.substring(this.name.lastIndexOf('/') + 1);
  }

  get assetname(): string {
    const filepath = this.name.split('.');
    return `${filepath[0]}.${MimeToExt[this.mime]}`;
  }

  public static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    return result !== undefined && MimeToExt[result.mime] !== undefined;
  }

  public static async from(file: File): Promise<Asset> {
    const blob = await file.arrayBuffer();
    const ft = await fileTypeFromBuffer(blob);
    const mime = ft?.mime ?? file.type;
    return new Asset([blob], file.name, mime);
  }
}
