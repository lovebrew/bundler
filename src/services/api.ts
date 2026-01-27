import { Injectable } from '@angular/core';

import { environment } from '@/environments/environment';
import { Asset } from '@/app/models/asset';
import { Config, extension, Target } from '@/app/models/config';
import { BundleFiles } from '@/app/models/bundle';
import { ZipService } from '@/services/zip';
import { IndexedDbService } from '@/services/database';

interface ApiResponse {
  files: string[];
  token: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private url = environment.url;

  constructor(
    private zip: ZipService,
    private db: IndexedDbService,
  ) { }

  private async fetch(path: string, body?: FormData): Promise<Response> {
    const method = body ? 'POST' : 'GET';
    const response = await fetch(`${this.url}/${path}`, { method, body });
    if (!response.ok) throw new Error('Request failed');
    return response;
  }

  async health(): Promise<string> {
    return this.fetch('health').then((r) => r.json());
  }

  async maintenance(): Promise<boolean> {
    const response = await fetch('config.json', { cache: 'no-store' });
    const { maintenance } = await response.json();
    return maintenance;
  }

  async convert(files: Array<Asset>): Promise<Array<File>> {
    if (files.length === 0) throw new Error('No files to convert');

    const lookup = await Promise.all(files.map((f) => this.db.get(f, f.assetname)));
    const mapping = new Map<string, File>();

    const cached = lookup.filter((f) => f !== undefined);
    const uncached = files.filter((_, i) => lookup[i] === undefined);
    uncached.forEach((f) => mapping.set(f.assetname, f));

    if (!uncached.length) return cached;

    const body = new FormData();
    uncached.forEach((file) => {
      body.append('files', file);
      body.append('paths', file.parent);
    });

    const response: ApiResponse = await this.fetch('convert', body).then((r) => r.json());
    const promises = response.files.map(async (path) => {
      const artifact = await this.artifact(response.token, path);
      const origin = mapping.get(artifact.name);
      await this.db.set(origin!, artifact, artifact.name);
      return artifact;
    });

    const result = await Promise.all(promises);
    return result.concat(cached);
  }

  private async appendGameData(binary: File, resources: Map<string, File[]>): Promise<File> {
    let content: File[];

    const base = resources.get('base');
    if (!base) throw new Error("No base files found.");
    const assets = resources.get('assets');
    if (!assets) throw new Error("No assets found.");
    const ctrAssets = resources.get('ctr');

    if (binary.name.endsWith(".3dsx")) {
      content = ctrAssets ? base.concat(ctrAssets) : base;
    } else {
      content = base.concat(assets);
    }

    const zip = await this.zip.create(content);
    const filename = binary.name.split('/').pop() ?? binary.name;
    return new File([binary, zip], filename);
  }

  private async getCompileKey(config: Config, target: Target, icon?: File): Promise<string> {
    return `${config.toString()}${target}${await icon?.text()}`;
  }

  async compile(files: BundleFiles, config: Config, icon?: File): Promise<Array<File>> {
    let resources: Map<string, File[]> = new Map();

    resources.set('base', files.source);
    resources.set('assets', files.assets);
    if (config.hasTarget('ctr') && files.assets.length) {
      const converted = await this.convert(files.assets);
      resources.set('ctr', converted);
    }

    const cached = new Array<File>();
    const targets = new Array<Target>();

    for (const target of config.getTargets()) {
      const key = await this.getCompileKey(config, target, icon);
      const data = await this.db.get(key, `${config.metadata.title}.${extension[target]}`);
      if (data) {
        cached.push(await this.appendGameData(data, resources));
      } else {
        targets.push(target);
      }
    }

    if (cached.length === config.build.targets.length) return cached;
    config.build.targets = targets;

    const body = new FormData();
    body.set('config', config.json);
    if (icon) body.set('icon', icon);

    const response: ApiResponse = await this.fetch('compile', body).then((r) => r.json());
    const promises = response.files.map((path) => this.artifact(response.token, path));

    const binaries = await Promise.all(promises);
    const result = new Array<File>();

    for (const binary of binaries) {
      result.push(await this.appendGameData(binary, resources));
      const parent = binary.name.split('/').pop()! as Target;
      const key = await this.getCompileKey(config, parent, icon);
      await this.db.set(key, binary, binary.name);
    }
    return result.concat(cached);
  }

  private async artifact(uuid: string, filepath: string): Promise<File> {
    const params = new URLSearchParams({ uuid, filepath }).toString();
    const blob = await this.fetch(`artifact?${params}`).then((r) => r.blob());

    return new File([blob], filepath);
  }
}
