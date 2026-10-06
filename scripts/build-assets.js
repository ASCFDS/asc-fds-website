import "./render-shell.js";
import "./render-content.js";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { execFileSync } from "node:child_process";
execFileSync("python3", ["scripts/build-search.py"], { stdio: "inherit" });
const rootDir = process.cwd();
const distDir = join(rootDir, "dist");
const publicFiles = [
  "robots.txt",
  "sitemap.xml",
  "CNAME",
  "CNAME.txt",
  "_redirects",
  "_headers",
];

const publicDirectories = ["spende"];

rmSync(distDir, { force: true, recursive: true });
mkdirSync(distDir, { recursive: true });

for (const entry of readdirSync(rootDir)) {
  if (entry.endsWith(".html")) {
    copy(entry);
  }
}

for (const file of publicFiles) {
  if (existsSync(join(rootDir, file))) {
    copy(file);
  }
}

for (const directory of publicDirectories) {
  if (existsSync(join(rootDir, directory))) {
    copy(directory);
  }
}

copy("assets");

function copy(path) {
  cpSync(join(rootDir, path), join(distDir, path), {
    recursive: true,
  });
}
