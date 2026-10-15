import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageDirectory, "..", "..");
const outputDirectory = resolve(packageDirectory, "dist");

// Shared packages keep their repository-relative layout so that relative
// imports inside the copied sources resolve unchanged inside the extension.
const sharedSources = [
  ["packages/core/src/did-key.mjs", "shared/core/src/did-key.mjs"],
  ["packages/core/src/entity.mjs", "shared/core/src/entity.mjs"],
  ["packages/core/src/evidence.mjs", "shared/core/src/evidence.mjs"],
  ["packages/core/src/review.mjs", "shared/core/src/review.mjs"],
  ["packages/core/src/signed-review.mjs", "shared/core/src/signed-review.mjs"],
  ["packages/browser-adapter/src/extract.mjs", "shared/browser-adapter/src/extract.mjs"]
];

await rm(outputDirectory, { recursive: true, force: true });
await cp(resolve(packageDirectory, "src"), outputDirectory, { recursive: true });

for (const [source, target] of sharedSources) {
  const destination = resolve(outputDirectory, target);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(repositoryRoot, source), destination);
}

await verifyRelativeImports(outputDirectory);

console.log(`Built unpacked extension in ${outputDirectory}`);

async function verifyRelativeImports(directory) {
  const missing = [];

  for (const file of await collectModules(directory)) {
    const source = await readFile(file, "utf8");
    const specifiers = [
      ...source.matchAll(/(?:^|[\s(])(?:import|export)[^"']*?["'](\.[^"']+)["']/gm)
    ].map(([, specifier]) => specifier);

    for (const specifier of specifiers) {
      const target = resolve(dirname(file), specifier);
      const exists = await stat(target).then(() => true, () => false);
      if (!exists) {
        missing.push(`${relative(directory, file)} -> ${specifier}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`unresolved imports in the extension build:\n  ${missing.join("\n  ")}`);
  }
}

async function collectModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectModules(entryPath)));
    } else if (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}
