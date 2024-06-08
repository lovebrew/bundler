import { validate } from "./utilities";

export type MediaResponse = {
  [key: string]: string;
  log: string;
};

export type MediaFile = {
  data: Blob;
  filepath: string;
};

export default class MediaConverter {
  protected url: string;
  public log!: File;

  constructor(path: string) {
    this.url = `${import.meta.env.DEV ? process.env.BASE_URL : ""}${path}`;
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

  public async convert(files: MediaFile[]): Promise<MediaFile[]> {
    const body = new FormData();

    for (const file of files) {
      if (!(await validate(file))) {
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

    let file: MediaFile;

    for (const key in response) {
      if (key !== "log") {
        const filepath = key;
        const decoded = await (
          await fetch(`data:${type};base64,${response[key]}`)
        ).blob();

        const content = new Blob([decoded], { type });
        file = { filepath, data: content };
      } else {
        const content = new Blob([response[key]], { type: "text/plain" });
        file = { filepath: "convert.log", data: content };
        this.log = new File([content], "convert.log");
      }

      mediaFiles.push(file);
    }

    return mediaFiles;
  }
}
