import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function setup() {
  process.env.DATABASE_URL = "file:../database/test.db";
  process.env.JWT_SECRET = "test-secret";
  process.env.NODE_ENV = "test";
  const databasePath = path.resolve("database/test.db");
  fs.rmSync(databasePath, { force: true });
  fs.rmSync(`${databasePath}-journal`, { force: true });
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
  fs.mkdirSync(path.resolve("recordings-test"), { recursive: true });
}
