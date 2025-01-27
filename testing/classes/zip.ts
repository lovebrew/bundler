import { ZipReader, Entry, BlobReader } from '@zip.js/zip.js';
import fs from 'fs';

export class ZipFile {
  private zip: ZipReader<BlobReader>;

  constructor(path: string) {
    const blob: Blob = new Blob([fs.readFileSync(path)]);
    this.zip = new ZipReader(new BlobReader(blob));
  }

  public async getEntries(): Promise<Array<Entry>> {
    return await this.zip.getEntries();
  }

  public async getEntry(filename: string): Promise<Entry | undefined> {
    const entries = await this.getEntries();
    return entries.find((entry) => entry.filename == filename);
  }
}

