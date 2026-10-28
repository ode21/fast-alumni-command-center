import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "domain.js",
  "seed.js",
  "client.js",
  "daftar.html",
  "form.css",
  "form.js",
  "login.html",
  "login.js",
  "mobile.css",
])
  await copyFile(file, `dist/${file}`);
console.log("Static build ready: dist");
