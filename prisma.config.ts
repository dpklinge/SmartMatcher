import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrate: {
    seed: {
      run: "node prisma/seed.mjs",
    },
  },
});
