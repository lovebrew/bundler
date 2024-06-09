import Bundle from "./Bundle";
import { ConfigMetadata } from "./Config";
import { BundleIcons, BundleCache, BundleType, BundleAssets, getExtension } from "./types";

import { convertFiles, isMediaFile, getConversionLog } from "./utilities";

import localforage from "localforage";

import JSZip from "jszip";
import MurmurHash3 from "imurmurhash";

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

  /**
   * Generates the game assets for the specified target.
   * @param target The target to generate assets for.
   * @param files The files to generate assets from.
   * @returns {Promise<Blob>} - The generated game assets.
   */
  private async getGameAssets(
    target: string,
    files: Array<File>
  ): Promise<Blob> {
    const zip = new JSZip();

    // things we could convert
    const filtered = files.filter((file) => isMediaFile(file));

    // anything not convertable
    const main = files.filter((file) => !isMediaFile(file));

    let result: Array<File> = [];

    if (target === "ctr") {
      const converted = await convertFiles(filtered);
      const data = converted.map(
        (file) => new File([file.data], file.filepath)
      );

      result = main.concat(data);
    } else {
      result = main.concat(filtered);
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

    let assets: BundleAssets = {};
    for (const target of targets) {
      assets[target] = await this.getGameAssets(target, files);
    }

    if (!packaged) return this.bundleContentLoose(assets);

    const metadata = bundle.getMetadata();
    const name = bundle.getMetadata().title;

    const hashData = await bundle.getHashData();
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
    content: string,
  ): Promise<BundleCache | null> {
    const hash = MurmurHash3(content).result().toString();

    return await localforage.getItem(hash);
  }

  public async setCachedBundle(
    content: string,
    cache: BundleCache): Promise<void> {
    const hash = MurmurHash3(content).result().toString();

    await localforage.setItem(hash, cache);
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
    for (target in binaries) {
      if (assets[target] === undefined) continue;

      const binary = binaries[target] as Blob;
      const game = assets[target] as Blob;

      const fused = await Promise.all(
        [binary, game].map(async (blob) => blob.arrayBuffer())
      );

      const file = new File(
        fused,
        `${name}.${getExtension(target)}`
      );

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
      let binaries: BundleCache = {};

      for (let [key, value] of Object.entries(json)) {
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
