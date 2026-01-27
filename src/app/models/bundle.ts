import { BlobReader, BlobWriter, ZipReader, TextWriter } from '@zip.js/zip.js';

import { Config } from '@/app/models/config';
import { Asset } from '@/app/models/asset';
import { fileTypeFromBuffer } from 'file-type';

export interface BundleFiles {
  assets: Array<Asset>;
  source: Array<File>;
}

export class Bundle {
  private reader: ZipReader<BlobReader>;
  private config: Config | undefined = undefined;

  private assets: Array<Asset> = [];
  private source: Array<File> = [];
  private icon: File | undefined = undefined;

  constructor(file: File) {
    this.reader = new ZipReader(new BlobReader(file));
  }

  dispose(): void {
    this.reader.close();
  }

  async load(): Promise<void> {
    const entries = await this.reader.getEntries();
    if (!entries.length) throw new Error('No entries found');

    const config = entries.find((e) => e.filename === Config.Filename);
    if (!config || config.directory) throw new Error('Config file not found');
    this.config = new Config(await config.getData(new TextWriter()));

    const icon = entries.find((e) => e.filename === this.config?.metadata.icon);
    if (icon && !icon.directory) {
      const blob = await icon.getData(new BlobWriter());
      this.icon = new File([blob], icon.filename);
    }

    const prefix = `${this.config.build.source}/`;
    const files = entries.filter((e) => e.filename.startsWith(prefix));
    if (!files.length) throw new Error('No source files found');

    const promises = files.map(async (entry) => {
      if (entry.directory) return;

      const blob = await entry.getData(new BlobWriter());
      const file = new File([blob], entry.filename.replace(prefix, ''));

      // dumb check if someone leaves converted assets in here
      if (file.name.endsWith(".bcfnt") || file.name.endsWith(".t3x")) {
        return;
      }

      if (await Asset.isValid(file)) {
        this.assets.push(await Asset.from(file));
      } else {
        this.source.push(file);
      }
    });

    await Promise.all(promises);
  }

  getConfig(): Config | undefined {
    return this.config;
  }

  get files(): BundleFiles {
    return { source: this.source, assets: this.assets };
  }

  get iconFile(): File | undefined {
    return this.icon;
  }

  static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    return result?.mime === 'application/zip';
  }
}
