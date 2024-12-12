import { useState } from 'react';
import Logo from '@/src/assets/logo.svg';
import styles from './index.module.css';

import { toastError, toastSuccess } from "@components/Toast";
import { processAssetGameFiles, processBundleGameFiles } from "@/src/services/BundleService";
import { BundlerError, UploadError } from "@/src/error";
import { zipMimes } from '@/src/types';
import { isValidFile, getMIMEFromFile } from '@/src/utility';

import toast from 'react-hot-toast';
import { logError } from '@/src/services/LoggingService';
import Bundle from '@/src/classes/Bundle';
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

  const validateFiles = async (files: Array<File>): Promise<void> => {
    const result: Array<string> = [];
    for (const file of files) {
      const valid = await isValidFile(file);

      if (!valid) {
        const type = await getMIMEFromFile(file);
        result.push(`${file.name}: Invalid file type: ${type || "unknown"}`);
      }
    }

    if (result.length > 0) {
      logError(`Upload errors detected for files:`, result);
      throw new BundlerError(UploadError.FileUploadFailed);
    }
  }

  async function handleUpload(files: Array<File>): Promise<void> {
    try {
      if (files.length === 0) {
        throw new BundlerError(UploadError.NoFilesUploaded);
      }

      await validateFiles(files);

      const file = files[0];
      if (file.name == Bundle.CONFIG_NAME) {
        loadConfiguration(await file.text());
        toastSuccess("Configuration OK.");
        return;
      }

      const mime = await getMIMEFromFile(file);

      if (mime && zipMimes.includes(mime)) {
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
