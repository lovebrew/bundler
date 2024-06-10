import Bundle from "./Bundle";
import { ConfigMetadata } from "./Config";
import {
  BundleIcons,
  BundleCache,
  BundleType,
  BundleAssets,
  getExtension,
  BundleAssetCache,
  MediaFile,
} from "./types";

import { convertFiles, isMediaFile, getConversionLog } from "./utilities";

import JSZip from "jszip";
import MurmurHash3 from "imurmurhash";
import { binariesCache, assetsCache } from "../dbutils";

export type BundlerResponse = {
  message: string;
  file?: Promise<Blob>;
};

export default class Bundler {
  private file: File;
  public log!: File;

  readonly extensions = {
    ctr: "3dsx",
    cafe: "wuhb",
    hac: "nro",
  };

  constructor(zip: File) {
    this.file = zip;
  }

  /*
   ** Retrieves a 3DS converted asset from IndexDB
   ** @param {string} contentHash - The hash of the content to retrieve.
   ** @returns {Promise<File | null>} - The file from the cache.
   */
  private async getCachedAsset(contentHash: string): Promise<File | null> {
    return await assetsCache.getItem(contentHash);
  }

  /*
   ** Caches a 3DS converted asset into IndexDB
   ** @param {string} contentHash - The hash of the content to cache.
   ** @param {File} cache - The file to cache.
   */
  private async setCachedAsset(
    contentHash: string,
    cache: File
  ): Promise<void> {
    const today = new Date();
    const expiration = new Date(today.setDate(today.getDate() + 3)).valueOf();
    const value: BundleAssetCache = { file: cache, timestamp: expiration };

    await assetsCache.setItem(contentHash, value);
  }

  private async cacheAsset(file: File, converted: Array<MediaFile>) {
    const filename = file.name.split(".")[0];
    console.log("Caching file...", filename);

    const convertedFile = converted.find((element) => {
      const convertedFilename = element.filepath.split(".")[0];
      console.log("Found converted file:", convertedFilename);
      return convertedFilename === filename;
    });

    const value = new TextDecoder().decode(await file.arrayBuffer());
    const hash = MurmurHash3(value).result().toString();

    const cache = await this.getCachedAsset(hash);
    if (convertedFile && cache === null) {
      console.log("Caching converted file...");
      const file = new File([convertedFile.data], convertedFile.filepath);
      this.setCachedAsset(hash, file);
    }
  }

  /**
   * Generates the game assets for the specified target.
   * @param target The target to generate assets for.
   * @param files The files to generate assets from.
   * @returns {Promise<Blob>} - The generated game assets.
   */
  private async getGameAssets(
    target: BundleType,
    files: Array<File>
  ): Promise<Blob> {
    const zip = new JSZip();

    // anything not convertable
    const main = files.filter((file) => !isMediaFile(file));
    let result: Array<File> = [];

    // things we could convert
    const convertable = files.filter((file) => isMediaFile(file));

    if (target === "ctr") {
      console.log("Converting files for CTR target...");

      const cached: Array<File> = [];
      const nonCached: Array<File> = [];

      for (const file of convertable) {
        const asset = await this.getCachedAsset(file.name);

        if (asset !== null) {
          cached.push(asset);
        } else {
          nonCached.push(file);
        }
      }

      const converted = await convertFiles(nonCached);

      nonCached.forEach(async (file) => {
        await this.cacheAsset(file, converted);
      });

      const final = converted.map(
        (file) => new File([file.data], file.filepath)
      );

      result = main.concat(cached, final);
    } else {
      result = main.concat(convertable);
    }

    for (const file of result) {
      zip.file(file.name, file);
    }

    return await zip.generateAsync({ type: "blob" });
  }

  /**
   * Prepares the content for bundling by:
   * 1. Validating the bundle.
   * 2. Finding all defined icons.
   * 3. Fetching the game content for each target.
   *   • This includes converting the content for the CTR target.
   * 4. Check if the cache exists for the target ELF binary.
   *  • If it does, use the cached binary.
   *  • If it doesn't, send the metadata to the server for compilation and cache it.
   * 5. Fuse the game content into a single file.
   * @returns {Promise<BundlerResponse>} - The response from the server.
   */
  public async bundleContent(): Promise<BundlerResponse> {
    const bundle = new Bundle(this.file);
    await bundle.validate();

    const icons = await bundle.findDefinedIcons();
    const targets = bundle.getTargets();

    const files = await bundle.getSourceFiles();
    const packaged = bundle.isPackaged();

    const assets: BundleAssets = {};
    for (const target of targets) {
      assets[target] = await this.getGameAssets(target, files);
    }

    if (!packaged) return this.bundleContentLoose(assets);

    const metadata = bundle.getMetadata();
    const name = bundle.getMetadata().title;

    const hashData = MurmurHash3(await bundle.getHashData())
      .result()
      .toString();
    const cache = await this.getCachedBundles(hashData);

    if (cache !== null) {
      return this.fuseBundleContent(metadata.title, cache, assets);
    }

    const binaries = await this.sendCompile(targets, icons, metadata);
    this.setCachedBundle(hashData, binaries);

    return this.fuseBundleContent(name, binaries, assets);
  }

  /*
   * Caches a bundle into localstorage
   * @param {string} content - The content string from the toml and icons.
   */
  public async getCachedBundles(
    contentHash: string
  ): Promise<BundleCache | null> {
    return await binariesCache.getItem(contentHash);
  }

  public async setCachedBundle(
    contentHash: string,
    cache: BundleCache
  ): Promise<void> {
    await binariesCache.setItem(contentHash, cache);
  }

  /**
   * Bundles the game content for loose files
   *  • This is used when the game is not packaged
   * @param data The game content to bundle.
   * @returns {Promise<BundlerResponse>} - The response from the server.
   */
  private async bundleContentLoose(
    data: BundleAssets
  ): Promise<BundlerResponse> {
    const bundle = new JSZip();

    let target: BundleType;
    for (target in data) {
      if (data[target] === undefined || data[target] === null) continue;
      bundle.file(`${target}-assets.zip`, data[target] as Blob);
    }

    const files = bundle.generateAsync({ type: "blob" });
    return { message: "Success.", file: files };
  }

  /**
   * Bundles the game content for packaged files.
   * • This is used when the game is bundled into a single file.
   * @param content The game content to bundle.
   * @returns {Promise<BundlerResponse>} - The response from the server.
   */
  private async fuseBundleContent(
    name: string,
    binaries: BundleCache,
    assets: BundleAssets
  ): Promise<BundlerResponse> {
    const bundle: JSZip = new JSZip();

    let target: BundleType;
    for (target in assets) {
      if (assets[target] === undefined) continue;

      const binary = binaries[target] as Blob;
      const game = assets[target] as Blob;

      const fused = await Promise.all(
        [binary, game].map(async (blob) => blob.arrayBuffer())
      );

      const file = new File(fused, `${name}.${getExtension(target)}`);

      bundle.file(file.name, file);
    }

    bundle.file("compile.log", this.log);

    if (getConversionLog() !== null) {
      bundle.file("convert.log", getConversionLog()!);
    }

    return {
      message: "Success.",
      file: bundle.generateAsync({ type: "blob" }),
    };
  }

  /**
   * Sends the metadata to the server for compilation.
   * @param targets The targets to compile for.
   * @param icons The icons to use.
   * @param metadata The metadata to use.
   */
  private async sendCompile(
    targets: Array<BundleType>,
    icons: BundleIcons,
    metadata: ConfigMetadata
  ): Promise<BundleCache> {
    // append the icons as FormData
    const body = new FormData();
    for (const [target, blob] of Object.entries(icons)) {
      if (blob === undefined) continue;
      body.append(`icon-${target}`, blob as Blob);
    }

    const url = `${import.meta.env.DEV ? process.env.BASE_URL : ""}`;
    const endpoint = `${url}/compile`;

    // create the URL parameters
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(metadata)) {
      if (key === "icons") continue;
      query.append(key, String(value));
    }
    query.append("targets", targets.join(","));

    try {
      // send the request
      const response = await fetch(`${endpoint}?${query.toString()}`, {
        method: "POST",
        body: body,
      });

      const json = await response.json();

      // process the response
      const today = new Date();
      const expiration = new Date(today.setDate(today.getDate() + 3)).valueOf();

      const binaries: BundleCache = { timestamp: expiration };

      for (const [key, value] of Object.entries(json)) {
        if (key === "log") continue;

        const decodedBinary = await fetch(`data:file/${key};base64,${value}`);
        const data = await decodedBinary.blob();

        binaries[key as BundleType] = new File([data], key);
      }

      if (json["log"] !== undefined) {
        this.log = new File([json["log"]], "compile.log");
      }

      return binaries;
    } catch (error) {
      throw new Error("Failed to send request");
    }
  }
}
