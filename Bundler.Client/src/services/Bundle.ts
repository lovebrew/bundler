import JSZip, { JSZipObject } from "jszip";
import Config, { ConfigMetadata, parseConfig } from "./Config";

export type BundleIcons = {
  ctr?: Blob;
  cafe?: Blob;
  hac?: Blob;
};

/*
 ** Bundler class
 ** Represents a bundle of files and configuration.
 */
export default class Bundle {
  private file: File;

  private zip: JSZip | undefined;
  private config: Config | undefined;

  readonly ConfigName = "lovebrew.toml";

  constructor(zip: File) {
    this.file = zip;
  }

  /**
   * Validates the bundle
   * @returns {Promise<boolean>} - Whether the file is a valid bundle.
   */
  public async validate(): Promise<boolean> {
    this.zip = await JSZip.loadAsync(this.file);

    const data = await this.zip.file(this.ConfigName)?.async("string");

    if (data === undefined) {
      throw Error("Missing configuration file.");
    }

    this.config = parseConfig(data);

    const source = this.config.build.source;
    if (this.zip.file(new RegExp(`^${source}/.+`)).length === 0) {
      throw Error(`Source folder '${source}' not found.`);
    }

    return true;
  }

  /**
   * Finds all defined icons in the bundle.
   * @returns {Promise<BundleIcon>} - A map of icon names to their respective blobs.
   */
  public async findDefinedIcons(): Promise<BundleIcons> {
    if (this.zip === undefined) {
      throw Error("Zip file not loaded.");
    }

    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    const result: BundleIcons = {};
    const icons = this.config.getIcons();

    for (const [key, value] of Object.entries(icons)) {
      const file = this.zip.file(value);

      if (file === null) continue;

      const blob = await file.async("blob");
      result[key as keyof BundleIcons] = blob;
    }

    return result;
  }

  /**
   * Fetches all files within the defined source directory.
   * @returns {Promise<Array<File>>} - An array of files within the source directory.
   */
  public async getSourceFiles(): Promise<Array<File>> {
    if (this.zip === undefined) {
      throw Error("Zip file not loaded.");
    }

    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    const source = this.config.build.source;

    const files = await Promise.all(
      this.zip
        .file(new RegExp(`^${source}/.+`))
        .map(async (file: JSZipObject) => {
          const blob = await file.async("blob");
          const length = source.length + 1;

          return new File([blob], file.name.slice(length));
        })
    );

    return files;
  }

  public getMetadata(): ConfigMetadata {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.metadata;
  }

  public getTargets(): Array<string> {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.build.targets;
  }

  public isPackaged(): boolean {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.isPackaged();
  }
}
