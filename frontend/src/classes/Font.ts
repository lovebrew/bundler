import opentype from 'opentype.js';

export class Font {
  public filename: string = "";
  public file: File;

  constructor(file: File) {
    this.file = file;
  }

  /*
  ** Loads an ArrayBuffer as a Font.
  ** If this fails, we know the File is not a Font or Texture.
  */
  async load(): Promise<Font | undefined> {
    try {
      const buffer = await this.file.arrayBuffer();
      const font = opentype.parse(buffer);

      // Basic font validation
      if (!font.supported) {
        return undefined;
      }

      // Check if font has basic required tables
      if (!font.tables.head || !font.tables.cmap) {
        return undefined;
      }

      this.filename = `${this.file.name.substring(0, this.file.name.indexOf("."))}.bcfnt`;
      return this;
    } catch {
      return undefined;
    }
  }

  public getFilename(): string {
    return this.file.name;
  }

  public async arrayBuffer(): Promise<ArrayBuffer> {
    return await this.file.arrayBuffer();
  }
}

export async function loadFont(file: File) {
  return await new Font(file).load();
}
