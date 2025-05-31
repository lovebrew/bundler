import { useState } from 'react';
import { handleUpload } from '@/upload';

import '@/styles/dropzone.css';
import { toastError, toastSuccess } from './Toast';

const ACCEPTED_FILETYPES = [
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.otf',
  '.ttf',
  '.toml'
];

export default function DropZone() {
  const [isDragActive, setDragActive] = useState<boolean>(false);

  const handleDragEnter = () => setDragActive(true);
  const handleDragLeave = () => setDragActive(false);

  async function performUpload(files: Array<File>) {
    const result = await handleUpload(files);
    if (!result.ok) {
      return toastError(result.error);
    }
    toastSuccess(result.value);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    await performUpload(files);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.target.files as FileList);
    await performUpload(files);
  }

  return (
    <div className={`drop-zone-content ${isDragActive ? 'active' : ''}`}>
      <input
        id="file-upload"
        type="file"
        title=""
        accept={ACCEPTED_FILETYPES.join(',')}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onChange={handleChange}
        multiple
        className="file-input"
      />
    </div>
  );
}
