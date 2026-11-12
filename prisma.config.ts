// prisma.config.ts
import "dotenv/config"; // ensures Prisma loads your .env file

export default {
  schema: "./prisma/schema.prisma", // path to your schema
  migrations: {
    seed: "node --require ts-node/register prisma/seed.ts",
  },
};
