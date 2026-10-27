import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

/**
 * Development launcher.
 *
 * `npm run dev` normally just starts Next.js. When MONGODB_URI points at
 * localhost and nothing is listening yet, this launcher also starts the local
 * development MongoDB (`scripts/dev-db.ts`) so a fresh checkout works with a
 * single command. Remote/cluster URIs are left untouched.
 *
 * Use `npm run dev:next` to start Next.js without this check.
 */

loadEnvConfig(process.cwd());

const root = process.cwd();
const bin = (name: string) => path.join(root, "node_modules", ".bin", name);

interface LocalMongo {
  host: string;
  port: number;
  database: string;
}

function parseLocalMongo(uri: string | undefined): LocalMongo | null {
  if (!uri) return null;

  try {
    const url = new URL(uri);

    if (url.protocol !== "mongodb:") return null;

    const host = url.hostname.replace(/^\[|\]$/g, "");
    const isLocal = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);

    if (!isLocal) return null;

    return {
      host: host === "localhost" || host === "0.0.0.0" ? "127.0.0.1" : host,
      port: Number(url.port || 27017),
      database: url.pathname.replace(/^\//, "") || "sales_crm",
    };
  } catch {
    return null;
  }
}

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForPort(
  host: string,
  port: number,
  attempts = 60,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isPortOpen(host, port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

const children: ChildProcess[] = [];

function stopChildren(signal: NodeJS.Signals) {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

async function main() {
  const local = parseLocalMongo(process.env.MONGODB_URI);

  if (local && !(await isPortOpen(local.host, local.port))) {
    console.log(
      `\nMongoDB is not running on ${local.host}:${local.port}. Starting the local dev database…\n`,
    );

    const database = spawn(bin("tsx"), ["scripts/dev-db.ts"], {
      stdio: "inherit",
      env: {
        ...process.env,
        DEV_DB_PORT: String(local.port),
        DEV_DB_NAME: local.database,
      },
    });

    children.push(database);
    database.once("exit", (code) => {
      if (code !== 0) {
        console.error("The local MongoDB process stopped unexpectedly.");
        stopChildren("SIGTERM");
        process.exit(code ?? 1);
      }
    });

    const ready = await waitForPort(local.host, local.port);

    if (!ready) {
      console.error(
        `MongoDB did not start on ${local.host}:${local.port}. Run \`npm run db\` manually to see the error.`,
      );
      stopChildren("SIGTERM");
      process.exit(1);
    }
  }

  const next = spawn(bin("next"), ["dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });

  children.push(next);

  next.once("exit", (code, signal) => {
    stopChildren("SIGTERM");
    process.exit(code ?? (signal ? 1 : 0));
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopChildren(signal);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Failed to start the dev server.",
  );
  stopChildren("SIGTERM");
  process.exit(1);
});
