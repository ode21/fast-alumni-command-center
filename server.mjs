import http from "node:http";
import { readFile } from "node:fs/promises";
const allowed = new Set([
  "index.html",
  "style.css",
  "mobile.css",
  "app.js",
  "domain.js",
  "seed.js",
  "client.js",
  "daftar.html",
  "form.css",
  "form.js",
  "login.html",
  "login.js",
]);
http
  .createServer(async (req, res) => {
    let file =
      new URL(req.url, "http://localhost").pathname.slice(1) || "index.html";
    if (file === "daftar") file = "daftar.html";
    if (file === "login") file = "login.html";
    if (file === "api/workspace") {
      try {
        const { default: handler } = await import("./api/workspace.js");
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const response = await handler.fetch(
          new Request("http://" + req.headers.host + req.url, {
            method: req.method,
            headers: req.headers,
            ...(req.method === "POST" ? { body: Buffer.concat(chunks) } : {}),
          }),
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch {
        res.writeHead(500).end("Server error");
      }
      return;
    }
    if (!allowed.has(file)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html; charset=utf-8",
      );
      res.end(data);
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(3000, "127.0.0.1", () => console.log("Local: http://127.0.0.1:3000"));
