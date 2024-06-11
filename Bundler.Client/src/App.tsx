import Flask from "@components/Flask";
import Footer from "@components/Footer";
import Banner from "@components/Banner";

import Bundler, { BundlerResponse } from "./services/Bundler";
import { Toaster, toast } from "react-hot-toast";

import successSfx from "@assets/sound/success.ogg";
import errorSfx from "@assets/sound/error.ogg";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Ignore broken library typings
import useSound from "use-sound";
import JSZip from "jszip";

import { MediaFile } from "./services/types";
import MediaConverter from "./services/MediaConverter";

import mime from "mime";

const ZipTypes = ["application/x-zip-compressed", "application/zip"];

const isZipFile = (file: File) => {
  const mimeType = mime.getType(file.name);

  if (mimeType === null) return false;

  return ZipTypes.includes(mimeType);
}

const downloadBlob = (blob: Blob) => {
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `bundle.zip`;
  link.click();

  window.URL.revokeObjectURL(link.href);
};

function App() {
  const [playSuccess] = useSound(successSfx);
  const [playError] = useSound(errorSfx);

  const handleUploadSuccess = (response: BundlerResponse) => {
    toast.promise(response.file as Promise<Blob>, {
      loading: "Downloading..",
      success: (blob) => {
        playSuccess();
        downloadBlob(blob);
        return "Downloaded.";
      },
      error: () => {
        playError();
        return "Something went wrong!";
      },
    });

    return response.message;
  };

  const handleUploadError = (error: BundlerResponse | string) => {
    playError();

    const message = typeof error === "string" ? error : error.message;
    return `Error: ${message}`;
  };

  const handleZipUpload = async (archive: File) => {
    const bundler = new Bundler(archive);

    toast.promise(bundler.bundleContent(), {
      loading: "Uploading..",
      success: handleUploadSuccess,
      error: handleUploadError,
    });
  };

  const handleConversions = async (files: Array<File>) => {
    toast.promise(MediaConverter.instance.convert(files), {
      loading: "Uploading..",
      success: (files: Array<MediaFile>) => {
        playSuccess();
        const zip = new JSZip();

        for (const file of files) {
          zip.file(file.filepath, file.data);
        }

        zip
          .generateAsync({ type: "blob" })
          .then((blob: Blob) => downloadBlob(blob));
        return "Downloaded.";
      },
      error: handleUploadError,
    });
  };

  const handleUpload = async (files: Array<File>) => {
    try {
      for (const file of files) {
        if (file.size === 0) throw Error("Invalid file.");

        if (!MediaConverter.isValidFileType(file) && !isZipFile(file)) throw Error("Invalid file type.");

        if (isZipFile(file)) return handleZipUpload(file);
      }

      if (MediaConverter.areFilesValid(files)) {
        handleConversions(files);
      }
    } catch (exception) {
      toast.error(handleUploadError((exception as Error).message));
    }
  };

  return (
    <>
      <Banner />
      <Toaster
        toastOptions={{
          className: `
          bg-neutral-800
          text-white
          `,
          success: {
            className: `
            bg-green-600
            text-white
            `,
          },
          error: {
            className: `
            bg-red-600
            text-white
            `,
          },
        }}
      />
      <Flask
        uploadHandler={handleUpload}
        accept={[".zip", ".png", ".jpg", ".jpeg", ".otf", ".ttf"]}
      />
      <Footer />
    </>
  );
}

export default App;
