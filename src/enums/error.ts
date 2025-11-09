export enum BundleError {
  NoConfigFile = "No configuration file found.",
  InvalidZipFile = 'Failed to read bundle "{name}".',
  EmptyZipFile = "The uploaded zip file is empty.",
}

export enum ConfigError {
  InvalidContent = "Invalid TOML content.",
  InvalidConfiguration = "Invalid configuration file.",
}

export enum UploadError {
  FileUploadFailed = "File upload failed.",
}

export enum CompileError {
  FailedRequest = "Failed to send compile request.",
}

export enum ConvertError {
  FailedRequest = "Failed to send convert request.",
  NoFilesToConvert = "No files to convert.",
}

export type BundlerError =
  | UploadError
  | BundleError
  | ConfigError
  | CompileError
  | ConvertError;
