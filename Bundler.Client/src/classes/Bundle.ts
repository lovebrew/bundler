import {
  Configuration,
  loadConfiguration,
  Metadata,
} from "@/src/classes/Configuration";
import { BundlerError, BundleError } from "@/src/error";
import { BundleIcons, Console, fontMimes, imageMimes } from "@/src/types";

import { blobToBase64, getMIMEFromFile, validateIcon } from "@/src/utility";

import {
  ZipReader,
  BlobReader,
  Entry,
  TextWriter,
  BlobWriter,
} from "@zip.js/zip.js";

import MurmurHash3 from "imurmurhash";
import ignore, { Ignore } from "ignore";

class Bundle {
  public static CONFIG_NAME = "lovebrew.toml";
  private static IGNORE_NAME = ".bundleignore";

  private config: Configuration | undefined = undefined;
  private entries: Array<Entry> = [];
  private icons: BundleIcons | undefined = undefined;

  private static EXPECTED_DIMENSIONS: Record<Console, number> = {
    ctr: 48,
    hac: 256,
    cafe: 128,
  };

  private getFile(filename: string): Entry | undefined {
    return this.entries.find((entry: Entry) => entry.filename == filename);
  }

  private async readFile(filename: string): Promise<string | undefined> {
    const entry = this.getFile(filename);
    if (!entry) return undefined;
    return (await entry.getData?.(new TextWriter())) as string;
  }

  private async readFileBlob(filename: string): Promise<Blob | undefined> {
    const entry = this.getFile(filename);
    if (!entry) return undefined;
    return (await entry.getData?.(new BlobWriter())) as Blob;
  }

  private async getConfigFile(): Promise<Configuration | undefined> {
    const content = await this.readFile(Bundle.CONFIG_NAME);
    if (!content) return undefined;

    return loadConfiguration(content);
  }

  private async getIconFiles(): Promise<BundleIcons | undefined> {
    if (!this.config) {
      console.error("Bundle not loaded.");
      return undefined;
    }

    const iconInfo = this.config.getMetadata().icons;
    if (!iconInfo) return undefined;

    const icons: BundleIcons = {};

    for (const v in iconInfo) {
      const target = v as Console;
      if (!iconInfo[target]) continue;

      const blob = await this.readFileBlob(iconInfo[target]);

      if (!blob) {
        throw new BundlerError(BundleError.IconNotFound, { name: v });
      }

      const dimensions = Bundle.EXPECTED_DIMENSIONS[v as Console];
      const valid = await validateIcon(blob, dimensions);

      if (!valid) {
        throw new BundlerError(BundleError.InvalidIconDimensions, {
          name: v,
        });
      }

      icons[target] = blob;
    }

    return icons;
  }

  public async load(file: File): Promise<Bundle> {
    let reader: ZipReader<BlobReader> | undefined;

    try {
      const buffer = await file.arrayBuffer();
      const blob = new BlobReader(new Blob([buffer]));
      reader = new ZipReader(blob);

      this.entries = await reader.getEntries();
    } catch {
      throw new BundlerError(BundleError.InvalidBundle, {
        name: file.name,
      });
    } finally {
      if (reader) {
        await reader.close();
      }
    }

    this.config = await this.getConfigFile();

    if (!this.config) {
      throw new BundlerError(BundleError.NoConfigFile);
    }

    this.icons = await this.getIconFiles();

    return this;
  }

  public getTargets(): Array<Console> {
    if (!this.config) {
      console.error("Config not loaded.");
      return [];
    }

    return this.config.getBuild().targets;
  }

  public getDetails(): Metadata {
    if (!this.config) {
      throw Error("Config not loaded.");
    }

    return this.config.getMetadata();
  }

  private shouldFilter(
    directory: string,
    entry: Entry,
    rules: Ignore
  ): boolean {
    const valid = entry.filename.startsWith(directory) && !entry.directory;
    return valid && !rules.ignores(entry.filename);
  }

  public async getSourceFiles(): Promise<[Array<File>, Array<File>]> {
    if (!this.config) {
      console.error("Configuration not loaded.");
      return [[], []];
    }

    const directory = `${this.config.getBuild().source}/`;

    const rules: Ignore = ignore();
    const ignoreData = await this.readFile(Bundle.IGNORE_NAME);

    if (ignoreData) {
      rules.add(ignoreData);
    }
    rules.add(".git");

    const files = this.entries.filter((entry: Entry) =>
      this.shouldFilter(directory, entry, rules)
    );

    const source: Array<File> = [];
    const graphics: Array<File> = [];

    for (const file of files) {
      const filename = file.filename.replace(directory, "");
      const blob = await file.getData?.(new BlobWriter());

      if (!blob) throw Error("Cannot create blob");

      const data = new File([blob], filename);

      const mime = await getMIMEFromFile(data);
      if (mime && fontMimes.concat(imageMimes).includes(mime)) {
        graphics.push(data);
      } else {
        source.push(data);
      }
    }

    return [source, graphics];
  }

  public getIcons(): BundleIcons {
    if (!this.icons) return {};
    return this.icons;
  }

  public async calculateIndexHash(target: Console): Promise<string> {
    if (!this.config) return "";

    let iconString = "";
    const icons = this.getIcons();

    if (icons[target]) {
      iconString += await blobToBase64(icons[target]);
    }

    const hash = MurmurHash3(`${target}${iconString}}`);
    return `${this.config.getHash()}${hash.result().toString()}`;
  }
}

export default Bundle;

export async function loadBundle(file: File): Promise<Bundle> {
  return await new Bundle().load(file);
}
