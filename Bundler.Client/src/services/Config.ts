import toml from "toml";
import { BundleType } from "./types";

export type ConfigIcons = {
  ctr?: string;
  cafe?: string;
  hac?: string;
};

export type ConfigMetadata = {
  title: string;
  author: string;
  description: string;
  version: string;
  icons: ConfigIcons;
};

export type ConfigBuild = {
  targets: Array<string>;
  source: string;
  packaged?: boolean;
};

export default class Config {
  metadata!: ConfigMetadata;
  build!: ConfigBuild;
  public source: string = "";

  public getIcons(): ConfigIcons {
    return this.metadata.icons;
  }

  public getTargets(): Array<BundleType> {
    return this.build.targets as Array<BundleType>;
  }

  public isPackaged(): boolean {
    return this.build.packaged ?? false;
  }
}

export function parseConfig(content: string): Config {
  const configData = toml.parse(content);

  const config = new Config();
  config.source = content;

  Object.assign(config, configData);
  return config;
}
