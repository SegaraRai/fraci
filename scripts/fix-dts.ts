import { readFile, writeFile } from "node:fs/promises";

for (const file of ["dist/prisma.d.ts", "dist/prisma.d.cts"]) {
  const content = await readFile(file, "utf-8");
  const replaced = content.replace(
    "import { PrismaClient, Prisma } from '@prisma/client/extension.js'",
    "import { PrismaClient, Prisma } from '@prisma/client'"
  );
  if (replaced === content) {
    throw new Error(`Failed to replace import in ${file}`);
  }
  await writeFile(file, replaced);

  console.log("Replaced import in", file);
}
