import * as fs from "fs";
const BuildDirectory = "dist";

async function clean() {
  console.log("Cleaning the output directory...");
  fs.rmSync(BuildDirectory, { recursive: true, force: true });
}

async function build() {
  console.log("Building the client application...");

  try {
    const result = await Bun.build({
      entrypoints: ["src/index.html"],
      outdir: BuildDirectory,
      root: "src",
      minify: true,
      naming: {
        asset: "[dir]/[name]-[hash].[ext]",
      },
    });
    fs.copyFileSync("CNAME", "dist/CNAME");
    fs.copyFileSync("config.json", "dist/config.json");
    if (result.logs.length > 0) {
      console.warn("Build succeeded with warnings:");
      for (const message of result.logs) {
        console.warn(message);
      }
    }
  } catch (error) {
    console.error("Build failed:", error as AggregateError);
  }
}

async function main() {
  const StartTime = performance.now();
  if (fs.existsSync(BuildDirectory)) await clean();
  await build();

  const EndTime = performance.now();
  console.log(`Build completed in ${(EndTime - StartTime).toFixed(2)} ms`);
}

main().catch((error) => {
  console.error("An error occurred during the build process:", error);
  process.exit(1);
});
