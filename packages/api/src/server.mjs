import { createServer } from "node:http";
import { resolve } from "node:path";
import { createApiHandler } from "./app.mjs";
import { JsonStore } from "./store.mjs";

const port = parsePort(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "127.0.0.1";
const dataFile = resolve(process.env.VERITY_DATA_FILE ?? "data/verity.json");
const allowedOrigins = (
  process.env.VERITY_ALLOWED_ORIGINS ?? "http://127.0.0.1:4174"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const server = createServer(
  createApiHandler(new JsonStore(dataFile), { allowedOrigins })
);

server.listen(port, host, () => {
  console.log(`Verity API listening at http://${host}:${port}`);
});

function parsePort(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 65535) {
    throw new TypeError("PORT must be an integer from 0 to 65535");
  }
  return number;
}
