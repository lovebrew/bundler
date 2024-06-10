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
import { isZipFile, convertFiles, isValidFile, isFontFile, isImageFile } from "./services/utilities";

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

  const handleConversions = async (files: File[]) => {
    toast.promise(convertFiles(files), {
      loading: "Uploading..",
      success: (files: MediaFile[]) => {
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

  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        if (file.size === 0) throw Error("Invalid file.");

        if (!isValidFile(file)) throw Error("Invalid file type.");

        if (isZipFile(file)) handleZipUpload(file);
      }

      if (files.length > 0 && files.every((file) => isFontFile(file) || isImageFile(file))) {
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
