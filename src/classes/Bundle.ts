import { BundleError } from "@/enums/error";
import { fileTypeFromBuffer } from "file-type";
import { Config } from "@classes/Config";
import {
  BlobReader,
  BlobWriter,
  ZipReader,
  TextWriter,
  Entry,
} from "@zip.js/zip.js";
import { Asset } from "@classes/Asset";

export class Bundle {
  private config: Config | undefined = undefined;
  private reader: ZipReader<BlobReader>;

  private filename: string;

  private source: Array<File> = [];
  private assets: Array<Asset> = [];
  private icon: Asset | undefined = undefined;

  constructor(file: File) {
    this.reader = new ZipReader(new BlobReader(file));
    this.filename = file.name;
  }

  public async dispose(): Promise<void> {
    await this.reader.close();
  }

  public get name(): string {
    return this.filename;
  }

  public getTargets(): Array<string> {
    if (!this.config) {
      return [];
    }
    return Object.values(this.config.build.targets);
  }

  public async load(): Promise<void> {
    const entries = await this.reader.getEntries();
    if (!entries.length) {
      throw BundleError.EmptyZipFile;
    }

    await this.loadConfig(entries);
    await this.loadIcon(entries);
    await this.loadAssets(entries);
  }

  private async loadConfig(entries: Array<Entry>): Promise<void> {
    const configEntry = entries.find((e) => e.filename === Config.Filename);
    if (!configEntry || !configEntry.getData) {
      throw BundleError.NoConfigFile;
    }
    const configText = await configEntry.getData(new TextWriter());
    this.config = await Config.from(configText);
  }

  private async loadIcon(entries: Array<Entry>): Promise<void> {
    if (!this.config || !this.config.metadata.icon) {
      return;
    }

    const path = this.config.metadata.icon;
    const entry = entries.find((e) => e.filename === path);
    if (!entry || !entry.getData) {
      return;
    }

    const file = new File([await entry.getData(new BlobWriter())], entry.filename);
    this.icon = await Asset.from(file);
  }

  public get package(): boolean {
    return this.config?.build.package ?? false;
  }

  private async loadAssets(entries: Array<Entry>): Promise<void> {
    if (!this.config) {
      return;
    }

    const prefix = new RegExp(`^${this.config.build.source}/`);

    for (const entry of entries) {
      let filename = entry.filename;
      if (!entry.getData || entry.directory || !filename.match(prefix)) {
        continue;
      }
      filename = filename.replace(prefix, "");
      const file = new File([await entry.getData(new BlobWriter())], filename);

      (await Asset.isValid(file))
        ? this.assets.push(await Asset.from(file))
        : this.source.push(file);
    }
  }

  public get formData(): FormData | undefined {
    return this.config?.toFormData();
  }

  public getAssets(): [Array<File>, Array<Asset>] {
    return [this.source, this.assets];
  }

  public getIcon(): Asset | undefined {
    return this.icon;
  }

  static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    if (!result || result.mime !== "application/zip") {
      return false;
    }
    return true;
  }
}
