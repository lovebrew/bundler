import mime from "mime";
import { MediaFile, MediaResponse } from "./types";

export default class MediaConverter {
  protected url: string;
  private static log?: File;

  private static ImageTypes = ["image/png", "image/jpeg", "image/jpg"];
  private static FontTypes = ["font/ttf", "font/otf"];

  private static MAX_IMAGE_DIM = 1024;
  private static MIN_IMAGE_DIM = 3;

  static #instance: MediaConverter;

  private constructor() {
    this.url = `${import.meta.env.DEV ? process.env.BASE_URL : ""}/convert`;
  }

  public static get instance(): MediaConverter {
    if (!MediaConverter.#instance) {
      MediaConverter.#instance = new MediaConverter();
    }

    return MediaConverter.#instance;
  }

  public static getConversionLog(): File | undefined {
    return MediaConverter.log;
  }

  public static clearConversionLog(): void {
    MediaConverter.log = undefined;
  }

  protected isMediaResponse(response: unknown): response is MediaResponse {
    if (typeof response !== "object" || response === null) {
      return false;
    }

    const { log, ...rest } = response as MediaResponse;
    if (typeof log !== "string") {
      return false;
    }

    for (const key in rest) {
      if (typeof rest[key] !== "string") {
        return false;
      }
    }

    return true;
  }

  private static async validateImage(
    name: string,
    data: Blob
  ): Promise<boolean> {
    try {
      const image = await createImageBitmap(data);
      const dimensions = [image.width, image.height];

      if (
        dimensions.some((dim) => dim > MediaConverter.MAX_IMAGE_DIM) ||
        dimensions.some((dim) => dim < MediaConverter.MIN_IMAGE_DIM)
      ) {
        return false;
      } else return true;
    } catch (exception) {
      throw Error(`Texture '${name}' is invalid.`);
    }
  }

  private static async validateFont(
    name: string,
    data: Blob
  ): Promise<boolean> {
    try {
      const font = new FontFace("test", await data.arrayBuffer());
      await font.load();

      return true;
    } catch (exception) {
      throw Error(`Font '${name}' is invalid.`);
    }
  }

  private static getFileMimetype(file: MediaFile | File): string | null {
    const filename = file instanceof File ? file.name : file.filepath;
    return mime.getType(filename);
  }

  /**
   * Checks if the file is a valid texture mimetype
   * @param file The file to validate
   * @returns { boolean } True if the file is a valid texture mimetype
   */
  public static isValidTextureType(file: MediaFile | File): boolean {
    const type = MediaConverter.getFileMimetype(file);

    if (type === null) return false;
    return MediaConverter.ImageTypes.includes(type);
  }

  /**
   * Checks if the file is a valid font mimetype
   * @param file The file to validate
   * @returns { boolean } True if the file is a valid font mimetype
   */
  public static isValidFontType(file: MediaFile | File): boolean {
    const type = MediaConverter.getFileMimetype(file);

    if (type === null) return false;
    return MediaConverter.FontTypes.includes(type);
  }

  /**
   * Checks if the file is a valid mimetype for conversion
   * @param file The file to validate
   * @returns { boolean } True if the file is a valid mimetype for conversion
   */
  public static isValidFileType(file: MediaFile | File): boolean {
    if (MediaConverter.isValidTextureType(file)) {
      return true;
    } else if (MediaConverter.isValidFontType(file)) {
      return true;
    }

    return false;
  }

  /**
   * Validates the file based on its mimetype and content
   * @param file The file to validate
   * @returns { Promise<boolean> } True if the file is valid
   */
  public static async validateFile(file: MediaFile | File): Promise<boolean> {
    if (!MediaConverter.isValidFileType(file)) return false;

    const filename = file instanceof File ? file.name : file.filepath;
    const data = file instanceof File ? file : file.data;

    if (MediaConverter.isValidTextureType(file)) {
      const isValid = await MediaConverter.validateImage(filename, data);
      if (!isValid) throw Error(`Texture '${filename}' dimensions invalid.`); else return true;
    } else if (MediaConverter.isValidFontType(file)) {
      return await this.validateFont(filename, data);
    }

    return false;
  }

  public static areFilesValid(files: Array<File>): boolean {
    if (files.length === 0) false;

    return files.every((file) => file.size > 0 && MediaConverter.isValidFileType(file));
  }

  protected isMediaFile(file: unknown): file is MediaFile {
    return (
      typeof file === "object" &&
      file !== null &&
      "data" in file &&
      "filepath" in file
    );
  }

  private async sendRequest(method: string, body: FormData): Promise<object> {
    try {
      const request = await fetch(this.url, { method, body });
      const json = await request.json();

      return json;
    } catch (exception) {
      throw Error("Failed to send request.");
    }
  }

  public async convert(
    files: Array<MediaFile> | Array<File>
  ): Promise<Array<MediaFile>> {
    const fileMap = files.map((file) => {
      if (file instanceof File) {
        return {
          filepath: file.name,
          data: file,
        };
      }

      return file;
    });

    if (fileMap.length === 0) return Array<MediaFile>();

    const body = new FormData();

    for (const file of fileMap) {
      if (!(await MediaConverter.validateFile(file))) {
        throw Error(`Invalid file: ${file.filepath}`);
      }
      body.append(file.filepath, file.data);
    }

    const response = await this.sendRequest("POST", body);

    if (!this.isMediaResponse(response)) {
      throw Error("Invalid response from server.");
    }

    return await this.responseToMediaFileArray(response);
  }

  protected async responseToMediaFileArray(
    response: MediaResponse,
    type: string = "octet/stream"
  ): Promise<Array<MediaFile>> {
    const mediaFiles: Array<MediaFile> = [];

    for (const key in response) {
      if (key !== "log") {
        const filepath = key;
        const decoded = await (
          await fetch(`data:${type};base64,${response[key]}`)
        ).blob();

        const content = new Blob([decoded], { type });
        const file: MediaFile = { filepath, data: content };
        mediaFiles.push(file);
      }
    }
      console.log(response);
    if (response["log"]) {
      const content = new Blob([response["log"]], { type: "text/plain" });
      MediaConverter.log = new File([content], "convert.log");
    }

    return mediaFiles;
  }
}
