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

  public toFormData(): FormData {
    const form = new FormData();

    form.append("title", this.metadata.title);
    form.append("author", this.metadata.author);
    form.append("description", this.metadata.description);
    form.append("version", this.metadata.version);
    if (this.metadata.icon) {
      form.append("icon", this.metadata.icon);
    }

    this.build.targets.forEach((value) =>
      form.append("target", value),
    );

    return form;
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
