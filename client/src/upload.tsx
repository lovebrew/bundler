import { Result, ok, err } from '@/result';
import { BundlerError, UploadError } from '@/error';
import { Config } from '@classes/Config';
import { Bundle } from '@classes/Bundle';
import { toast } from 'sonner';

function handleAssetsUpload(assets: Array<File>) {}

async function handleZipUpload(
  zip: File
): Promise<Result<undefined, BundlerError>> {
  let result = await Bundle.from(zip);
  if (!result.ok) return err(result.error);
  return ok();
}

async function handleConfigUpload(
  file: File
): Promise<Result<string, BundlerError>> {
  let result = await Config.from(await file.text());
  if (!result.ok) return err(result.error);
  return ok('Configuration OK.');
}

export async function handleUpload(
  files: Array<File>
): Promise<Result<undefined | string, BundlerError>> {
  if (files.length === 0) {
    return err(UploadError.NoFilesUploaded);
  }

  for (const file of files) {
    if (await Config.isValid(file)) {
      const result = await handleConfigUpload(file);
      if (!result.ok) {
        if (files.length === 1) {
          return err(result.error);
        }
        console.error(result.error);
      }
    } else if (await Bundle.isValid(file)) {
      const result = await handleZipUpload(file);
      if (!result.ok) {
        if (files.length === 1) {
          return err(result.error);
        }
        console.error(result.error);
      }
    }
  }

  return ok();
}
