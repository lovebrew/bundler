function format(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/{(\w+)}/g, (_, key) => {
    return key in params ? params[key] : `{${key}}`;
  });
}

export enum BundleError {
  NoConfigFile = 'No configuration file found.',
  IconNotFound = 'Icon for "{name}" not found.',
  InvalidZipFile = 'Failed to read bundle "{name}".',
  InvalidIconDimensions = `Invalid icon for "{name}".`,
  EmptyZipFile = 'The uploaded zip file is empty.'
}

export enum ConfigError {
  InvalidContent = 'Invalid TOML content.',
  InvalidConfiguration = 'Invalid configuration file.'
}

export enum UploadError {
  NoFilesUploaded = 'No files uploaded.',
  FileUploadFailed = 'File upload failed.'
}

export enum CompileError {
  FailedRequest = 'Failed to send compile request.',
  FailedToCompile = 'Binaries failed to compile.'
}

export enum ConvertError {
  FailedRequest = 'Failed to send convert request.',
  InvalidFilesUploaded = 'Invalid file(s) uploaded.',
  FailedToConvertFiles = 'File(s) failed to convert.',
  NoFilesToConvert = 'No files to convert.'
}

export type BundlerError =
  | UploadError
  | BundleError
  | ConfigError
  | CompileError
  | ConvertError;
