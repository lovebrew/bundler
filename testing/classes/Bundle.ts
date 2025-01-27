import { BlobWriter, ZipWriter, TextWriter, BlobReader } from '@zip.js/zip.js';
import { readFileSync } from 'fs';
import path from 'path';


import { config } from '../config';


export default class Bundle {
  writer: BlobWriter;
  zip: ZipWriter<Blob>;

  constructor() {
    this.writer = new BlobWriter('application/zip');
    this.zip = new ZipWriter(this.writer);
  }

  public async addLocalFile(filepath: string) {
    const fullPath = path.resolve(config.resourcesDir, filepath);
    const filename = path.basename(fullPath);
    const buffer = readFileSync(fullPath);

    await this.addBufferFile(filename, buffer);

    return this;
  }

  public async addLocalFiles(files: Array<string>) {
    for (const file of files) {
      this.addLocalFile(file);
    }

    return this;
  }

  public async addBufferFiles(
    files: Array<{ filename: string; buffer: Buffer }>,
  ) {
    for (const file of files) {
      this.addBufferFile(file.filename, file.buffer);
    }

    return this;
  }

  public async addBufferFile(filename: string, buffer: Buffer) {
    await this.zip.add(filename, new BlobReader(new Blob([buffer])));
    return this;
  }

  public async close(): Promise<Buffer> {
    await this.zip.close();
    const blob = await this.writer.getData();

    return Buffer.from(await blob.arrayBuffer());
  }
}
