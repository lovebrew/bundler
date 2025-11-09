import ignore from "ignore";
import { Config } from "@classes/Config";

export class Ignore {
  public static readonly Filename = ".bundleignore";

  private readonly ignore = ignore();
  private static readonly DEFAULTS: Array<string> = [
    ".git",
    Ignore.Filename,
    Config.Filename,
  ];

  constructor(content: string) {
    this.ignore.add(Ignore.DEFAULTS);
    this.ignore.add(content);
  }

  /**
   * Determines whether the specified filename should be ignored based on the ignore rules.
   *
   * @param filename - The name of the file to test against the ignore pattern.
   * @returns `true` if the file is ignored; otherwise, `false`.
   */
  public filter(filename: string): boolean {
    return this.ignore.test(filename).ignored;
  }
}
