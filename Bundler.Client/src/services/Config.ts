import toml from "toml";

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

  public getIcons(): ConfigIcons {
    return this.metadata.icons;
  }

  public getTargets(): Array<string> {
    return this.build.targets;
  }

  public isPackaged(): boolean {
    return this.build.packaged ?? false;
  }
}

export function parseConfig(content: string): Config {
  const configData = toml.parse(content);
  const config = new Config();

  Object.assign(config, configData);
  return config;
}
