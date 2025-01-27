import { format } from "./utility";

export enum BundleError {
  NoConfigFile = "No configuration file found.",
  IconNotFound = 'Icon for "{name}" not found.',
  InvalidBundle = 'Failed to read bundle "{name}".',
  InvalidIconDimensions = `Invalid icon for "{name}".`,
}

export enum ConfigurationError {
  InvalidContent = "Invalid TOML content.",
  InvalidConfiguration = "Invalid configuration file.",
}

export enum UploadError {
  NoFilesUploaded = "No files uploaded.",
  FileUploadFailed = "File upload failed.",
}

export enum CompileError {
  FailedRequest = "Failed to send compile request.",
  FailedToCompile = "Binaries failed to compile.",
}

export enum ConvertError {
  FailedRequest = "Failed to send convert request.",
  InvalidFilesUploaded = "Invalid file(s) uploaded.",
  FailedToConvertFiles = "File(s) failed to convert.",
  NoFilesToConvert = "No files to convert.",
}

export type BundlerErrorType =
  | UploadError
  | BundleError
  | ConfigurationError
  | CompileError
  | ConvertError;

export class BundlerError extends Error {
  constructor(
    public type: BundlerErrorType,
    params?: { [key: string]: string }
  ) {
    super(format(type as string, params));
    this.name = "BundlerError";
  }
}
