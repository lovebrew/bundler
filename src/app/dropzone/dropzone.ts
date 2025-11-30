import { Component, ViewChild, ElementRef } from '@angular/core';

import { Asset } from '@/app/models/asset';
import { Bundle } from '@/app/models/bundle';
import { toastLoading } from '@/app/toast';
import { UploadService } from '@/services/upload';

@Component({
  selector: 'dropzone',
  templateUrl: 'dropzone.html',
  styleUrl: 'dropzone.css',
})
export class Dropzone {
  constructor(private service: UploadService) {}

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isDragOver = false;

  onDragOver(event: DragEvent) {
    event.preventDefault(); // must prevent default to allow drop
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files.length) {
      await this.addFiles(event.dataTransfer.files);
    }
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      await this.addFiles(input.files);
    }
  }

  private download(response: Blob) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(response);
    link.download = 'bundle.zip';
    link.click();

    window.URL.revokeObjectURL(link.href);
    return 'Downloaded.';
  }

  private async addFiles(inputFiles: FileList) {
    const files = Array.from(inputFiles);

    const assets = new Array<Asset>();
    const bundles = new Array<Bundle>();

    const filterPromises = files.map(async (file) => {
      if (await Asset.isValid(file)) {
        assets.push(await Asset.from(file));
      } else if (await Bundle.isValid(file)) {
        bundles.push(new Bundle(file));
      }
    });
    await Promise.all(filterPromises);

    toastLoading(this.service.upload(bundles, assets), this.download, 'Uploading..');
  }
}
