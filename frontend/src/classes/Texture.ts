export class Texture {
  static MIN_CTR_DIMENSIONS = 3;
  static MAX_CTR_DIMENSIONS = 1024;

  public file: File;
  public filename: string = "";
  private error: string = "";

  constructor(file: File) {
    this.file = file;
  }

  in_range(value: number): boolean {
    return value >= Texture.MIN_CTR_DIMENSIONS && value <= Texture.MAX_CTR_DIMENSIONS;
  }

  is_square(width: number, height: number, expected: number): boolean {
    return width === expected && height === expected;
  }

  /*
  ** Loads a Blob as a texture and validates its dimensions.
  ** If the Blob is not a texture, we assume it might be a Font.
  */
  async load(): Promise<[Texture | undefined, string | undefined]> {
    try {
      const blob = new Blob([await this.file.arrayBuffer()]);
      const image = await createImageBitmap(blob);

      const widthError = this.validateDimension(image.width, 'width');
      if (widthError) return [undefined, widthError];

      const heightError = this.validateDimension(image.height, 'height');
      if (heightError) return [undefined, heightError];

      this.filename = `${this.file.name.substring(0, this.file.name.indexOf("."))}.t3x`;
      return [this, undefined];
    } catch {
      return [undefined, undefined];
    }
  }

  private validateDimension(value: number, dimension: string): string | undefined {
    if (!this.in_range(value)) {
      const limit = value >= Texture.MAX_CTR_DIMENSIONS ? Texture.MAX_CTR_DIMENSIONS : Texture.MIN_CTR_DIMENSIONS;
      const type = limit === Texture.MAX_CTR_DIMENSIONS ? "limit" : "min";
      return `Invalid ${dimension}: ${value} (${type}: ${limit})`;
    }
    return undefined;
  }

  public isValid(): boolean {
    return this.error === "";
  }

  public async arrayBuffer() {
    return await this.file.arrayBuffer();
  }

  public getFilename(): string {
    return this.file.name;
  }

  async loadIcon() {

  }
}

export async function loadTexture(file: File) {
  return await new Texture(file).load();
}
