import { type } from 'arktype';
import { parse } from 'iarna-toml-esm';

export type Target = 'ctr' | 'hac' | 'cafe';
export const extension: Record<string, string> = {
  ctr: '3dsx',
  hac: 'nro',
  cafe: 'wuhb',
};

const Targets = type.enumerated('ctr', 'hac', 'cafe');

function unique<T>(arr: T[]) {
  return [...new Set(arr)] as T[];
}
const Metadata = type({
  title: 'string > 0',
  author: 'string > 0',
  description: 'string > 0',
  version: 'string.semver',
  icon: 'string?',
});

const Build = type({
  targets: Targets.array().pipe(unique<Target>),
  source: 'string',
});

const Root = type({
  metadata: Metadata,
  build: Build,
});

export class Config {
  static Filename: string = 'bundle.toml';
  private data: any;

  constructor(private source: string) {
    this.data = Root.assert(parse(source));
  }

  get metadata(): typeof Metadata.infer {
    return this.data.metadata;
  }

  get build(): typeof Build.infer {
    return this.data.build;
  }

  get root(): typeof Root.infer {
    return this.data;
  }

  get json(): string {
    const data = {
      ...this.metadata,
      targets: [...this.build.targets.values()],
    };
    return JSON.stringify(data);
  }

  hasTarget(target: Target): boolean {
    return this.build.targets.includes(target);
  }

  getTargets(): Array<Target> {
    return this.build.targets;
  }

  toString(): string {
    return this.metadata.toString();
  }

  static isValid(file: File): boolean {
    const name = file.name;
    return name == Config.Filename || name.endsWith('.toml');
  }
}
