import * as Cloudflare from "alchemy/Cloudflare";

export const BackendDatabase = Cloudflare.D1.Database("BackendDatabase", {
  migrationsDir: "./migrations",
});
