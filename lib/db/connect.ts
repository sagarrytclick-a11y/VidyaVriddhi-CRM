import mongoose from "mongoose";

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  connection: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Add it to .env.local before using the CRM.",
    );
  }

  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    mongoose.set("strictQuery", true);

    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8_000,
    });
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  if (mongoose.connection.readyState !== 1) {
    return true;
  }

  return (
    error.name === "MongooseServerSelectionError" ||
    error.name === "MongoNetworkError" ||
    error.name === "MongoServerSelectionError" ||
    error.name === "MongoNotConnectedError" ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|server selection timed out|connect timed out|before running operations|buffering timed out|topology is closed|connection .*closed/i.test(
      error.message,
    )
  );
}
