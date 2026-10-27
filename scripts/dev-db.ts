import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Local development database.
 *
 * Starts a MongoDB server on 127.0.0.1:27017 with a persistent data directory
 * (`.mongo-data/`) so the CRM keeps its data between restarts. This is a
 * convenience for machines without MongoDB installed — production deployments
 * should point MONGODB_URI at Atlas or a real MongoDB server.
 */

const PORT = Number(process.env.DEV_DB_PORT ?? 27017);
const DB_NAME = process.env.DEV_DB_NAME ?? "sales_crm";
const dbPath = path.join(process.cwd(), ".mongo-data");

async function main() {
  fs.mkdirSync(dbPath, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: {
      ip: "127.0.0.1",
      port: PORT,
      dbName: DB_NAME,
      dbPath,
      storageEngine: "wiredTiger",
    },
  });

  console.log(`MongoDB dev server ready: ${mongod.getUri(DB_NAME)}`);
  console.log(`Data directory: ${dbPath}`);
  console.log("Keep this process running, then start the app with `npm run dev`.");

  let stopping = false;

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`\nStopping MongoDB dev server (${signal})…`);
    await mongod.stop({ doCleanup: false });
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  setInterval(() => {}, 60_000);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Failed to start the dev database.",
  );
  process.exit(1);
});
