import { loadEnvConfig } from "@next/env";
import { connectToDatabase } from "../lib/db/connect";
import { User } from "../lib/models/User";

loadEnvConfig(process.cwd());

function toUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 32);
}

async function seed() {
  const name = (
    process.env.SUPER_ADMIN_NAME ?? process.env.SEED_ADMIN_NAME
  )?.trim();
  const email = (
    process.env.SUPER_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL
  )
    ?.trim()
    .toLowerCase() || null;
  const password =
    process.env.SUPER_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
  const username =
    toUsername(
      process.env.SUPER_ADMIN_USERNAME ??
        process.env.SEED_ADMIN_USERNAME ??
        "",
    ) ||
    (email ? toUsername(email.split("@")[0] ?? "") : "") ||
    (name ? toUsername(name) : "");

  if (!name || !username || !password) {
    throw new Error(
      "Set SUPER_ADMIN_NAME, SUPER_ADMIN_USERNAME (or SUPER_ADMIN_EMAIL), and SUPER_ADMIN_PASSWORD in .env.local (or .env) first.",
    );
  }

  if (username.length < 3) {
    throw new Error("SUPER_ADMIN_USERNAME must be at least 3 characters.");
  }

  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
  }

  await connectToDatabase();

  const existing = await User.findOne({
    $or: email ? [{ username }, { email }] : [{ username }],
  }).select("_id role isActive");

  if (existing) {
    existing.role = "SUPER_ADMIN";
    existing.isActive = true;
    existing.username = username;
    if (email) existing.email = email;
    await existing.save();
    console.log(`Updated existing account ${username} to SUPER_ADMIN.`);
    return;
  }

  await User.create({
    name,
    username,
    ...(email ? { email } : {}),
    password,
    role: "SUPER_ADMIN",
    isActive: true,
  });

  console.log(
    `Created SUPER_ADMIN account: ${username}${email ? ` (${email})` : ""}`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
