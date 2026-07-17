declare namespace Cloudflare {
  interface Env {
    readonly DB: D1Database;
  }

  interface GlobalProps {
    readonly mainModule: typeof import("./src/worker.ts");
  }
}
