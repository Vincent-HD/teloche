import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: true, service: "teloche-backend" }));
});

server.listen(port, () => {
  console.log(`teloche backend listening on http://localhost:${port}`);
});
