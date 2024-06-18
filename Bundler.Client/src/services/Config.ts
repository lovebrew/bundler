import toml from "toml";
import { BundleType } from "./types";

// Validation
const validateString = (value: any) => {
  return (typeof value === "string" || value instanceof String) && value.trim() !== "";
}

const validateBoolean = (value: any) => {
  return typeof value === "boolean" || value instanceof Boolean;
}

const validateBundleTypeList = (value: any) => {
  return (Array.isArray(value) && value.every((x) => x === "ctr" || x === "hac" || x === "cafe"));
}

type Icons = {
  [key in BundleType]?: string;
};

export type Metadata = {
  title: string;
  author: string;
  description: string;
  version: string;
  icons?: Icons;
};

const MetadataFields: Record<string, Function> = {
  "title": validateString,
  "author": validateString,
  "description": validateString,
  "version": validateString
};

type Build = {
  targets: Array<BundleType>;
  source: string;
  packaged?: boolean;
};

const BuildFields: Record<string, Function> = {
  "targets": validateBundleTypeList,
  "source": validateString,
  "packaged": validateBoolean
}

export default class Config {
  metadata!: Metadata;
  build!: Build;

  public getIcons(): Icons | undefined {
    return this.metadata.icons;
  }

  public getTargets(): Array<BundleType> {
    return this.build.targets as Array<BundleType>;
  }

  public isPackaged(): boolean {
    return this.build.packaged ?? false;
  }
}

export function loadConfig(content: string): Config {
    let parsed: undefined;

    try {
      parsed = toml.parse(content);
    } catch (exception) {
      throw new Error("Invalid config content. Unable to parse TOML.");
    }

    if (parsed === undefined) throw new Error("Invalid config content. Unable to parse TOML.");

    if (parsed["metadata"] == null || parsed["build"] == null) {
      const missing = parsed["metadata"] == null ? "metadata" : "build";
      throw new Error(`Invalid config content. Missing section: '${missing}'.`);
    }

    for (const field in MetadataFields) {
      if (parsed["metadata"][field] == null) throw new Error(`Missing config 'metadata' field '${field}'.`);

      const value = parsed["metadata"][field];
      if (!MetadataFields[field](value)) throw new Error(`Config 'metadata' field '${field}' type is invalid.`);
    }

    for (const field in BuildFields) {
      if (parsed["build"][field] == null) throw new Error(`Missing config 'build' field '${field}'.`);

      const value = parsed["build"][field];
      if (!BuildFields[field](value)) throw new Error(`Config 'build' field '${field}' type is invalid.`);
    }

    return Object.assign(new Config(), parsed);
}