import { BlobReader, BlobWriter, Entry, ZipReader, ZipWriter } from '@zip.js/zip.js';

import { Binary } from '@/enums/target';
import { ExportData } from '@/types';

export class Zipfile {
  static CtrRegex = new RegExp(`${Binary.Ctr}$`);
  static BinaryRegex = new RegExp(`(${Binary.Ctr}|${Binary.Hac}|${Binary.Cafe})$`);

  private readonly zip: ZipWriter<Blob>;
  private readonly hasAssets: boolean = false;

  constructor(private readonly binaries: Array<Entry>, private readonly games: ExportData) {
    this.zip = new ZipWriter(new BlobWriter("application/zip"));
    this.hasAssets = games.ctr !== undefined;
  }

  private getGameFiles(filename: string): Blob | undefined {
    const is3DS = Zipfile.CtrRegex.test(filename) && this.hasAssets;
    return is3DS ? this.games.ctr : this.games.default;
  }

  private async readBinaryFiles(): Promise<Array<{ name: string, blob: Blob }>> {
    return await Promise.all(
      this.binaries.filter(file => file.getData)
        .map(async (file) => ({
          name: file.filename,
          blob: await file.getData!(new BlobWriter)
        }))
    );
  }

  private async getExtractedFiles(data: Blob): Promise<Array<File>> {
    const zip = new ZipReader(new BlobReader(data));
    const entries = await zip.getEntries().catch(() => []);

    return await Promise.all(
      entries.filter(entry => entry.getData).map(async (entry) => {
        return new File([await entry.getData!(new BlobWriter)], entry.filename);
      })
    );
  }

  private async addExtractedDirectory(name: string, game: Blob): Promise<void> {
    const files = await this.getExtractedFiles(game);
    for (const file of files) {
      await this.zip.add(`${name}/${file.name}`, new BlobReader(file));
    }
  }

  private async addCombinedBinary(name: string, binary: Blob, game: Blob): Promise<void> {
    const combined = new Blob([binary, game]);
    await this.zip.add(name, new BlobReader(combined));
  }

  private async addLogFiles(files: Array<{ name: string, blob: Blob }>): Promise<void> {
    if (this.games.log) {
      await this.zip.add("convert.log", new BlobReader(this.games.log))
    }

    const log = files.find(file => /log$/.test(file.name));
    if (log) {
      await this.zip.add("compile.log", new BlobReader(log.blob));
    }
  }

  public async fuseGameFiles(packaged: boolean): Promise<void> {
    const files = await this.readBinaryFiles();
    for (const { name, blob } of files) {
      if (!Zipfile.BinaryRegex.test(name)) continue;
      const game = this.getGameFiles(name);
      if (!game) continue;
      if (!packaged && Zipfile.CtrRegex.test(name)) {
        const directory = name.replace(`.${Binary.Ctr}`, "");
        await this.addExtractedDirectory(directory, game);
      } else {
        await this.addCombinedBinary(name, blob, game);
      }
    }
    await this.addLogFiles(files);
  }

  public async close(): Promise<Blob> {
    return await this.zip.close();
  }
}
