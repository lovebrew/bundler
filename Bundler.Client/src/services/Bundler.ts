import Bundle, { BundleIcons } from "./Bundle";
import { ConfigMetadata } from "./Config";

import { convertFiles, isMediaFile, getConversionLog } from "./utilities";

import JSZip from "jszip";

export type BundlerResponse = {
  message: string;
  file?: Promise<Blob>;
};

type GameData = {
  binary: Blob;
  assets: Blob;
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
   * 4. Sending the content to the server.
   * @returns {Promise<BundlerResponse>} - The response from the server.
   */
  public async prepareContent(): Promise<BundlerResponse> {
    const bundle = new Bundle(this.file);
    await bundle.validate();

    const icons = await bundle.findDefinedIcons();
    const targets = bundle.getTargets();

    const files = await bundle.getSourceFiles();
    const packaged = bundle.isPackaged();

    const data: Map<string, GameData> = new Map();

    for (const target of targets) {
      const assets = await this.getGameAssets(target, files);
      data.set(target, { binary: new Blob(), assets });
    }

    if (!packaged) return this.bundleContentLoose(data);

    const metadata = bundle.getMetadata();
    const binaries = await this.sendCompile(targets, icons, metadata);

    for (const target of targets) {
      data.get(target)!.binary = binaries.get(target)!;
    }

    const name = bundle.getMetadata().title;
    return this.bundleContent(name, data);
  }

  /**
   * Bundles the game content for loose files
   *  • This is used when the game is not packaged
   * @param data The game content to bundle.
   * @returns {Promise<BundlerResponse>} - The response from the server.
   */
  private async bundleContentLoose(
    data: Map<string, GameData>
  ): Promise<BundlerResponse> {
    const bundle = new JSZip();

    for (const [key, value] of data) {
      bundle.file(`${key}-assets.zip`, value.assets);
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
  private async bundleContent(
    name: string,
    content: Map<string, GameData>
  ): Promise<BundlerResponse> {
    const bundle: JSZip = new JSZip();

    for (const [key, value] of content) {
      const binary = value.binary;
      const assets = value.assets;

      const combined = await Promise.all(
        [binary, assets].map(async (blob) => blob.arrayBuffer())
      );

      const file = new File(
        combined,
        `${name}.${this.extensions[key as keyof typeof this.extensions]}`
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
    targets: Array<string>,
    icons: BundleIcons,
    metadata: ConfigMetadata
  ): Promise<Map<string, Blob>> {
    const content = new Map<string, Blob>();

    // append the icons as FormData
    const body = new FormData();
    for (const [target, blob] of Object.entries(icons)) {
      body.append(`icon-${target}`, blob);
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
      for (const [key, value] of Object.entries(json)) {
        if (key !== "log") {
          const decoded = await fetch(`data:file/${key};base64,${value}`);
          const data = await decoded.blob();

          const file = new File([data], key);

          content.set(key, file);
        } else {
          const content = new Blob([value as BlobPart], { type: "text/plain" });
          this.log = new File([content], "log.txt");
        }
      }

      return content;
    } catch (error) {
      throw new Error("Failed to send request");
    }
  }
}
