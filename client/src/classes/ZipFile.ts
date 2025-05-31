import { BlobWriter, BlobReader, ZipWriter, ZipReader } from '@zip.js/zip.js';

export class ZipFile {
  writer: BlobWriter;
  zip: ZipWriter<Blob>;

  constructor() {
    this.writer = new BlobWriter('application/zip');
    this.zip = new ZipWriter(this.writer);
  }

  public async addFile(file: Array<File> | File): Promise<void> {
    let data: Array<File> = Array.isArray(file) ? file : [file];
    for (const f of data) {
      const blob = new Blob([await f.arrayBuffer()]);
      await this.zip.add(f.name, new BlobReader(blob));
    }
  }

  public async close(): Promise<void> {
    await this.zip.close();
  }
}
