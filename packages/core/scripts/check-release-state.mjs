import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const changelog = await readFile("CHANGELOG.md", "utf8");
const changelogVersion = changelog.match(/^## (\S+)$/m)?.[1];

if (changelogVersion === undefined) {
  throw new Error("CHANGELOG.md does not contain a release heading.");
}

if (packageJson.version !== changelogVersion) {
  throw new Error(
    `Package version ${packageJson.version} does not match the latest CHANGELOG.md version ${changelogVersion}.`,
  );
}
