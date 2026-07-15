import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";

const port = Number(process.env.PORT ?? 3000);
const currentDir = dirname(fileURLToPath(import.meta.url));
const openApiPath = join(currentDir, "../../../openapi/xtream-compatible.yaml");

const scalarHtml = (specification: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teloche Xtream OpenAPI</title>
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <script id="api-reference" type="application/json">${specification}</script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.5"></script>
  </body>
</html>`;

const scalarDocs = Effect.tryPromise({
  try: () => readFile(openApiPath, "utf8"),
  catch: (cause) => new Error("Unable to read the Xtream OpenAPI document", { cause }),
}).pipe(
  Effect.map((specification) => HttpServerResponse.text(scalarHtml(specification), {
    contentType: "text/html; charset=utf-8",
  })),
);

const app = HttpRouter.serve(
  HttpRouter.addAll([
    HttpRouter.route("GET", "/xtream-docs", scalarDocs),
  ]),
  { disableListenLog: true, disableLogger: true },
).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port })),
);

console.log(`Xtream Scalar docs available on http://localhost:${port}/xtream-docs`);
NodeRuntime.runMain(Layer.launch(app));
