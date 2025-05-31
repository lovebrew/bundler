import { type } from 'arktype';
import { x64 } from 'murmurhash3js';

import TOML from 'toml';
import { BundlerError, ConfigError } from '@/error';
import { Result, ok, err } from '@/result';

const Metadata = type({
  title: 'string > 0',
  author: 'string > 0',
  description: 'string > 0',
  version: 'string.semver'
});

const Build = type({
  targets: "('ctr' | 'hac' | 'cafe')[] > 0",
  source: 'string'
});

const Root = type({
  metadata: Metadata,
  build: Build
});

export class Config {
  private data: any;
  private hash: string;

  public static FileName: string = 'config.toml';

  constructor(source: string) {
    this.data = Root.assert(TOML.parse(source));
    this.data.build.targets = [...new Set(this.data.build.targets)];

    this.hash = x64.hash128(source);
  }

  static async isValid(file: File): Promise<boolean> {
    const name = file.name;
    return name == Config.FileName || name.endsWith('.toml');
  }

  static async from(source: string): Promise<Result<Config, ConfigError>> {
    try {
      return ok(new Config(source));
    } catch (error) {
      return err(ConfigError.InvalidConfiguration);
    }
  }

  public toString(): string {
    return this.hash;
  }
}
