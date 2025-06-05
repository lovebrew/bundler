import { Result, ok, err } from '@/result';
import { BundlerError, UploadError } from '@/error';
import { Bundle } from '@classes/Bundle';
import { Asset } from "@classes/Asset";

type AllowedFile = {
  file: File,
  isBundle: boolean,
  isAsset: boolean,
};

async function filterResults(
  results: Array<AllowedFile>
): Promise<[Array<Bundle>, Array<File>, Array<{ file: File; error: BundlerError }>]> {
  const bundleResults = await Promise.all(
    results
      .filter(r => r.isBundle)
      .map(async r => {
        const res = await Bundle.from(r.file);
        return { file: r.file, result: res };
      })
  );

  const bundles = bundleResults
    .filter(res => res.result.ok)
    .map(res => res.result.value as Bundle);

  const bundleErrors = bundleResults
    .filter(res => !res.result.ok)
    .map(res => ({
      file: res.file,
      error: res.result.error as BundlerError,
    }));

  const assets = results
    .filter(r => !r.isBundle && r.isAsset)
    .map(r => r.file);

  return [bundles, assets, bundleErrors];
}

export async function handleUpload(
  files: Array<File>
): Promise<Result<undefined | string, BundlerError>> {
  if (files.length === 0) {
    return err(UploadError.NoFilesUploaded);
  }

  const results = await Promise.all(
    files.map(async (file: File) => ({
      file,
      isBundle: await Bundle.isValid(file),
      isAsset: await Asset.isValid(file),
    }))
  );

  const [bundles, assets, errors] = await filterResults(results);
  console.log(bundles);
  console.log(assets);
  console.warn(errors);

  return ok("Uploaded");
}
