import * as Cloudflare from "alchemy/Cloudflare";

// Alchemy applies these Drizzle-generated files remotely; Drizzle's migrator
// is reserved for isolated local D1 databases.
export const BackendDatabase = Cloudflare.D1.Database("BackendDatabase", {
  migrationsDir: "./migrations",
});
