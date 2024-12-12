import Bundle, { loadBundle } from "../classes/Bundle";

import { compileFromBundle } from "./CompileService";
import { convertFiles } from "./ConvertService";

import {
  BlobWriter,
  BlobReader,
  ZipWriter,
  ZipReader,
  Entry,
} from "@zip.js/zip.js";
import { BundleBinaries, Console, extensions } from "@/src/types";

class ZipContainer {
  writer: BlobWriter;
  zip: ZipWriter<Blob>;

  constructor() {
    this.writer = new BlobWriter("application/zip");
    this.zip = new ZipWriter(this.writer);
  }

  public async addFile(file: File) {
    const data = new Blob([await file.arrayBuffer()]);
    this.zip.add(file.name, new BlobReader(data));
  }

  public async getContents(): Promise<Array<Entry>> {
    const blobReader = new BlobReader(await this.writer.getData());
    const zipReader = new ZipReader(blobReader);

    return await zipReader.getEntries();
  }

  public async getBlob(): Promise<Blob> {
    return await this.writer.getData();
  }

  public async close(): Promise<void> {
    await this.zip.close();
  }
}

type GameContent = {
  [key in Console]?: ZipContainer;
};

/**
 * Processes a game bundle by converting assets and compiling them, packaging them into a ZIP archive.
 *
 * @param file - An `File` object representing the game zip bundle to process.
 * @returns A promise that resolves to a `Blob` containing the finalized ZIP archive of compiled assets.
 *
 */
export const processBundleGameFiles = async (zip: File): Promise<Blob> => {
  const result = new ZipContainer();

  const bundle: Bundle = await loadBundle(zip);
  const targets = bundle.getTargets();

  const containers: GameContent = {};
  const [source, graphics] = await bundle.getSourceFiles();

  /* let's convert things, if necessary */
  let resources: Array<File> = [];
  if (targets.includes("ctr")) {
    resources = await convertFiles(graphics);
  }

  /* add files to the game containers */
  for (const target of targets) {
    containers[target] = new ZipContainer();

    const assets = target === "ctr" ? resources : graphics;
    for (const file of source.concat(assets)) {
      await containers[target].addFile(file);
    }

    await containers[target].close();
  }

  /* compile the binaries */
  const binaries: BundleBinaries = await compileFromBundle(bundle);

  const name = bundle.getDetails().title;

  for (const target of targets) {
    if (!binaries[target]) continue;
    const binary = binaries[target];

    if (!containers[target]) continue;
    const content = await containers[target].getBlob();

    const filename = `${name}.${extensions[target]}`;
    await result.addFile(new File([binary, content], filename));
  }

  await result.close();
  const blob = await result.getBlob();

  return blob;
};

/**
 * Processes a list of game asset files by converting them and packaging them into a ZIP archive.
 *
 * @param files - An array of `File` objects representing the game asset files to process.
 * @returns A promise that resolves to a `Blob` containing the finalized ZIP archive of processed assets.
 *
 */
export const processAssetGameFiles = async (
  files: Array<File>
): Promise<Blob> => {
  const container = new ZipContainer();

  const assets = await convertFiles(files);
  for (const file of assets) {
    await container.addFile(file);
  }
  await container.close();

  return await container.getBlob();
};
