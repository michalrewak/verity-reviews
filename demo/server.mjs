import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const demoDirectory = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const pathname = decodeURIComponent(requestedPath.split("?")[0]);
  const filePath = normalize(join(demoDirectory, pathname));

  if (!filePath.startsWith(demoDirectory)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(500);
    response.end("Unable to read demo asset");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Verity demo running at http://127.0.0.1:${port}`);
});
