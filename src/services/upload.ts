import { Injectable } from '@angular/core';

import { ApiService } from '@/services/api';
import { Bundle } from '@/app/models/bundle';
import { Asset } from '@/app/models/asset';
import { ZipService } from '@/services/zip';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(
    private api: ApiService,
    private zip: ZipService,
  ) {}

  public async upload(bundles: Bundle[], assets: Asset[]): Promise<Blob> {
    if (bundles.length && assets.length) {
      throw new Error('File upload failed.');
    }

    let data = null;
    if (bundles.length) {
      const promises = bundles.map(async (bundle) => {
        await bundle.load();
        const config = bundle.getConfig();
        if (!config) throw new Error('Bundle config is invalid.');
        data = await this.api.compile(bundle.files, config, bundle.icon);
      });
      await Promise.all(promises);
    } else {
      data = await this.api.convert(assets);
    }
    if (!data) throw new Error('File upload failed.');
    return this.zip.create(data);
  }
}
