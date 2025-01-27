import { useState } from 'react';
import Logo from '@/src/assets/logo.svg';
import styles from './index.module.css';

import { toastError, toastSuccess } from "@components/Toast";
import { processAssetGameFiles, processBundleGameFiles } from "@/src/services/BundleService";
import { BundlerError, UploadError } from "@/src/error";

import toast from 'react-hot-toast';
import Bundle, { isValidBundle } from '@/src/classes/Bundle';
import { loadConfiguration } from '@/src/classes/Configuration';

const Flask = () => {
  const [isDragActive, setDragActive] = useState<boolean>(false);

  const handleDragEnter = () => setDragActive(true);
  const handleDragLeave = () => setDragActive(false);

  const accept: string = [
    '.zip',
    '.png',
    '.jpg',
    '.jpeg',
    '.otf',
    '.ttf',
    '.toml'
  ].join(",");

  const downloadBlob = (blob: Blob): string => {
    toastSuccess();
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `bundle.zip`;
    link.click();

    window.URL.revokeObjectURL(link.href);
    return "Downloaded."
  };

  const handleZipUpload = async (zip: File) => {
    toast.promise(processBundleGameFiles(zip), {
      loading: "Uploading..",
      success: downloadBlob,
      error: (error: Error) => {
        toastError();
        return error.message;
      }
    });
  }

  const handleAssetsUpload = async (files: Array<File>) => {
    toast.promise(processAssetGameFiles(files), {
      loading: "Uploading..",
      success: downloadBlob,
      error: (error: Error) => {
        toastError();
        return error.message;
      }
    });
  }

  async function handleUpload(files: Array<File>): Promise<void> {
    try {
      if (files.length === 0) {
        throw new BundlerError(UploadError.NoFilesUploaded);
      }

      const file = files[0];
      if (file.name == Bundle.CONFIG_NAME) {
        loadConfiguration(await file.text());
        toastSuccess("Configuration OK.");
        return;
      }

      if (await isValidBundle(file)) {
        return await handleZipUpload(file);
      }
      await handleAssetsUpload(files);
    } catch (exception) {
      if (exception instanceof Error) {
        return toastError(exception.message);
      }
      toastError("An unexpected error occurred.");
    }
  }

  const handleDrop = (fileEvent: React.DragEvent<HTMLInputElement>): void => {
    fileEvent.preventDefault();
    setDragActive(false);
    const files = Array.from(fileEvent.dataTransfer.files);
    handleUpload(files);
  };

  const handleChange = (fileEvent: React.ChangeEvent<HTMLInputElement>): void => {
    fileEvent.preventDefault();
    setDragActive(false);
    const fileList = fileEvent.target.files as FileList;
    const files = Array.from(fileList);
    handleUpload(files);
    fileEvent.target.value = '';
  };

  return (
    <div className={styles.flaskContainer}>
      <img id="flaskImage" className={styles.flaskImage} src={Logo} alt="Flask Logo" />
      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : styles.dropZoneInactive} `}
      >
        <input
          id='fileUpload'
          type='file'
          title=''
          accept={accept}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onChange={handleChange}
          multiple
          className={styles.fileInput}
        />
      </div>
    </div>
  );
};

export default Flask;
