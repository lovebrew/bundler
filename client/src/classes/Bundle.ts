import { ok, err, Result } from '@/result';
import { BundlerError, BundleError } from '@/error';
import { fileTypeFromBuffer } from 'file-type';
import { Config } from '@classes/Config';
import {
  BlobReader,
  BlobWriter,
  ZipReader,
  Entry,
  TextWriter
} from '@zip.js/zip.js';

export class Bundle {
  private readonly IgnoreFile = '.bundleignore';
  private config: Config | undefined = undefined;

  constructor(private readonly entries: Array<Entry>) {}

  async loadConfig(): Promise<Result<undefined, BundlerError>> {
    const file = await this.readFile<string>(Config.FileName, new TextWriter());
    if (!file) return err(BundleError.NoConfigFile);
    const config = await Config.from(file);
    if (!config.ok) return err(config.error);
    this.config = config.value;
    return ok(undefined);
  }

  private getFile(filename: string): Entry | undefined {
    return this.entries.find((entry: Entry) => entry.filename == filename);
  }

  private async readFile<T>(
    filename: string,
    writer: BlobWriter | TextWriter
  ): Promise<T | undefined> {
    const entry = this.getFile(filename);
    if (!entry) return undefined;
    return (await entry.getData?.(writer)) as T;
  }

  static async isValid(file: File): Promise<boolean> {
    const result = await fileTypeFromBuffer(await file.arrayBuffer());
    if (!result || result.mime !== 'application/zip') {
      return false;
    }
    return true;
  }

  static async from(file: File): Promise<Result<Bundle, BundlerError>> {
    const zipReader = new ZipReader(new BlobReader(file));
    const entries = await zipReader.getEntries();
    await zipReader.close();

    if (!entries || entries.length === 0) {
      return err(BundleError.EmptyZipFile);
    }

    const bundle = new Bundle(entries);
    const success = await bundle.loadConfig();

    if (!success.ok) {
      return err(success.error);
    }
    return ok(bundle);
  }
}
