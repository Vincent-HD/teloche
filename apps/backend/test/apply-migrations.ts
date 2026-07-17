import { env } from "cloudflare:workers";
import {
  applyD1Migrations,
  type D1Migration,
} from "cloudflare:test";

interface TestEnvironment {
  readonly DB: D1Database;
  readonly TEST_MIGRATIONS: Array<D1Migration>;
}

const testEnvironment = env as unknown as TestEnvironment;

await applyD1Migrations(
  testEnvironment.DB,
  testEnvironment.TEST_MIGRATIONS,
);
