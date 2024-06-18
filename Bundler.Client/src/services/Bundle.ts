import JSZip, { JSZipObject } from "jszip";
import Config, { Metadata, loadConfig } from "./Config";

import { BundleIcons, BundleType } from "./types";

import mime from "mime";

const IconMimetypes: Record<string, Array<string>> = {
  "ctr": ["image/png"],
  "hac": ["image/jpeg", "image/jpg"],
  "cafe": ["image/png"]
};

const ExpectedDimensions: Record<string, number> = {
  "ctr": 48,
  "hac": 256,
  "cafe": 128
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
  private configContent: string | undefined;

  constructor(zip: File) {
    this.file = zip;
  }

  private async validateIconDimensions(target: string, file: JSZipObject): Promise<boolean> {
    try {
      const data = await file.async("blob");

      const image = await createImageBitmap(data);
      const dimensions = [image.width, image.height];

      if (dimensions.some((dim) => dim != ExpectedDimensions[target])) {
        return false;
      }

      return true;
    } catch (error) {
      throw new Error(`Invalid icon for ${target}.`);
    }
  }

  /**
   * Validates the bundle
   * @returns {Promise<boolean>} - Whether the file is a valid bundle.
   */
  public async validate(): Promise<boolean> {
    this.zip = await JSZip.loadAsync(this.file);

    const data = await this.zip.file(this.ConfigName)?.async("string");

    if (data === undefined) throw Error("Missing configuration file.");
    if (data.trim() === "") throw Error("Invalid configuration file.");

    this.configContent = data;
    this.config = loadConfig(data);

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

    if (icons === undefined) return result;

    for (const [key, value] of Object.entries(icons)) {
      const file = this.zip.file(value);

      if (file === null) continue;

      const mimetype = mime.getType(file.name)

      if (mimetype === null) throw new Error(`Icon for ${key} has no mimetype.`);
      if (!IconMimetypes[key].includes(mimetype)) throw new Error(`Invalid ${key} icon mimetype.`);
      if (!await this.validateIconDimensions(key, file)) throw new Error(`Invalid ${key} icon dimensions.`);

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

  private async blobToBase64(blob: Blob): Promise<string> {
    // const value = reader.result as string;
    // const base64data = value[value.indexOf(", ") + 1];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result;
        if (typeof res === "string") {
          console.log(res);
          resolve(res);
        } else {
          reject(res);
        }
      };
      reader.readAsDataURL(blob);
    });
  }

  public async getHashData(): Promise<string> {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    const icons = await this.findDefinedIcons();

    let iconData = "";
    let key: BundleType;

    for (key in icons) {
      if (icons[key] === undefined) continue;
      iconData += await this.blobToBase64(icons[key] as Blob);
    }

    return this.configContent + iconData;
  }

  public getMetadata(): Metadata {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.metadata;
  }

  public getTargets(): Array<BundleType> {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.getTargets();
  }

  public isPackaged(): boolean {
    if (this.config === undefined) {
      throw Error("Configuration file not loaded.");
    }

    return this.config.isPackaged();
  }
}
