import { BundlerError, ConfigurationError } from "@/src/error";
import { logError } from "@/src/services/LoggingService";
import MurmurHash3 from "imurmurhash";

import toml from "toml";
import { z } from "zod";

const ConsoleSchema = z.enum(["ctr", "hac", "cafe"]);

const BundleIconsSchema = z.record(ConsoleSchema, z.string());
const SEMANTIC_VERSION_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const MetadataSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().min(1),
  version: z
    .string()
    .regex(SEMANTIC_VERSION_REGEX, "Expected Semantic Version string"),
  icons: BundleIconsSchema.optional(),
});

const BuildSchema = z.object({
  targets: z
    .array(ConsoleSchema)
    .min(1)
    .transform((values) => [...new Set(values)]),
  source: z.string().min(1),
});

const ConfigurationSchema = z.object({
  metadata: MetadataSchema,
  build: BuildSchema,
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type Build = z.infer<typeof BuildSchema>;

export class Configuration {
  private hash: string;

  private metadata: Metadata;
  private build: Build;

  constructor(source: string, data: { build: Build; metadata: Metadata }) {
    this.hash = MurmurHash3(source).result().toString();
    this.build = data.build;
    this.metadata = data.metadata;
  }

  public getHash(): string {
    return this.hash;
  }

  public getMetadata(): Metadata {
    return this.metadata;
  }

  public getBuild(): Build {
    return this.build;
  }
}

export function loadConfiguration(content: string): Configuration {
  let result;

  try {
    result = toml.parse(content);
  } catch {
    throw new BundlerError(ConfigurationError.InvalidContent);
  }

  const parsed = ConfigurationSchema.safeParse(result);

  if (!parsed.success) {
    const messages: Array<string> = [];
    parsed.error.errors.forEach((error) => {
      messages.push(`${error.path.join(".")}: ${error.message}`);
    });

    logError("Configuration validation failed:", messages);
    throw new BundlerError(ConfigurationError.InvalidConfiguration);
  }

  return new Configuration(content, parsed.data);
}
