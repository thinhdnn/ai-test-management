import { PrismaClient } from "@prisma/client";

// Log database URL to help diagnose connection issues
console.log("Database URL:", process.env.DATABASE_URL);

// Skip database during build if NEXT_PUBLIC_SKIP_DB_CHECKS is true
const shouldSkipDB = process.env.NEXT_PUBLIC_SKIP_DB_CHECKS === 'true' && process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('memory');

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a complete mock client if skipping database
const createMockHandler = () => {
  return {
    get: () => createMockHandler(),
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    createMany: () => Promise.resolve({ count: 0 }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    upsert: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    count: () => Promise.resolve(0),
  };
};

// Create a proxy to handle all possible Prisma calls during build
const mockPrismaClient = new Proxy({
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
}, {
  get: (target, prop) => {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    return createMockHandler();
  }
});

export const prisma =
  globalForPrisma.prisma ||
  (shouldSkipDB 
    ? mockPrismaClient as unknown as PrismaClient
    : new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
