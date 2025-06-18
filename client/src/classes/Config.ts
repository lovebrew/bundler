import { type } from "arktype";
import { x64 } from "murmurhash3js";

import TOML from "toml";
import { ConfigError } from "@/enums/error";

const Metadata = type({
  title: "string > 0",
  author: "string > 0",
  description: "string > 0",
  version: "string.semver",
  icon: "string?",
});

const Build = type({
  targets: "('ctr' | 'hac' | 'cafe')[] > 0",
  source: "string",
  package: "boolean",
});

const Root = type({
  metadata: Metadata,
  build: Build,
});

export class Config {
  private data: any;
  private hash: string;

  public static Filename: string = "bundle.toml";

  constructor(source: string) {
    this.data = Root.assert(TOML.parse(source));
    this.data.build.targets = [...new Set(this.data.build.targets)];

    this.hash = x64.hash128(source);
  }

  get metadata(): typeof Metadata.infer {
    return this.data.metadata;
  }

  get build(): typeof Build.infer {
    return this.data.build;
  }

  public toQuery(): URLSearchParams {
    const result = {
      ["metadata.title"]: this.metadata.title,
      ["metadata.author"]: this.metadata.author,
      ["metadata.description"]: this.metadata.description,
      ["metadata.version"]: this.metadata.version,
    };
    const params = new URLSearchParams(result);
    this.build.targets.forEach((value) =>
      params.append("target", value),
    );
    return params;
  }

  static async isValid(file: File): Promise<boolean> {
    const name = file.name;
    return name == Config.Filename || name.endsWith(".toml");
  }

  static async from(source: string): Promise<Config> {
    try {
      return new Config(source);
    } catch (error) {
      throw ConfigError.InvalidConfiguration;
    }
  }

  public toString(): string {
    return this.hash;
  }
}
