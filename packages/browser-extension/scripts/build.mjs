import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageDirectory, "..", "..");
const outputDirectory = resolve(packageDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, "shared", "core"), { recursive: true });
await mkdir(resolve(outputDirectory, "shared", "browser-adapter"), { recursive: true });
await cp(resolve(packageDirectory, "src"), outputDirectory, { recursive: true });

for (const name of ["entity.mjs", "evidence.mjs", "review.mjs", "signed-review.mjs"]) {
  await cp(
    resolve(repositoryRoot, "packages", "core", "src", name),
    resolve(outputDirectory, "shared", "core", name)
  );
}
await cp(
  resolve(repositoryRoot, "packages", "browser-adapter", "src", "extract.mjs"),
  resolve(outputDirectory, "shared", "browser-adapter", "extract.mjs")
);

console.log(`Built unpacked extension in ${outputDirectory}`);
