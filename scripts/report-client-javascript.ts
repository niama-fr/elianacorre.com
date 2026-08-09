import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const APPLICATIONS = [
  { directory: "apps/web/dist/client/assets", name: "public" },
  { directory: "apps/app/dist/client/assets", name: "authenticated" },
] as const;

type Application = (typeof APPLICATIONS)[number];

const measureApplication = async ({ directory, name }: Application) => {
  const assetDirectory = path.resolve(directory);
  let files: string[];
  try {
    const assetNames = await readdir(assetDirectory);
    files = assetNames.filter((file) => file.endsWith(".js")).toSorted();
  } catch (error) {
    throw new Error(`Cannot read client assets at ${assetDirectory}. Run bun run build first.`, { cause: error });
  }
  if (files.length === 0) throw new Error(`No client JavaScript found at ${assetDirectory}. Run bun run build first.`);

  const contents = await Promise.all(files.map(async (file) => await readFile(path.join(assetDirectory, file))));
  return {
    brotliBytes: contents.reduce((total, content) => total + brotliCompressSync(content).byteLength, 0),
    files: files.length,
    gzipBytes: contents.reduce((total, content) => total + gzipSync(content).byteLength, 0),
    name,
    rawBytes: contents.reduce((total, content) => total + content.byteLength, 0),
  };
};

const reports = await Promise.all(APPLICATIONS.map(measureApplication));
for (const report of reports)
  process.stdout.write(
    `${report.name} client JavaScript (${report.files} files): ${report.rawBytes} raw / ${report.gzipBytes} gzip / ${report.brotliBytes} brotli bytes\n`
  );
