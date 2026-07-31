import { copyFile, mkdir, readdir } from "node:fs/promises";

await mkdir("typedoc", { recursive: true });
for (const entry of await readdir("public", { withFileTypes: true })) {
  if (entry.isFile()) {
    await copyFile(`public/${entry.name}`, `typedoc/${entry.name}`);
  }
}
