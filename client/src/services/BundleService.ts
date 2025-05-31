import { ZipFile } from '@classes/ZipFile';

export function processBundleGameFiles(bundle: ZipFile): Promise<Blob> {}

export async function processAssetGameFiles(
  files: Array<File>
): Promise<Blob> {}
