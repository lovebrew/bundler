import { Injectable } from '@angular/core';

import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';

@Injectable({
  providedIn: 'root',
})
export class ZipService {
  public async create(data: Array<File>): Promise<Blob> {
    const writer = new ZipWriter(new BlobWriter('application/zip'));
    await Promise.all(
      data.map(async (file) => {
        await writer.add(file.name, new BlobReader(file));
      }),
    );
    return await writer.close();
  }
}
