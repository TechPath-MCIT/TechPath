// prisma.config.ts
import path from 'path';
//import { dotenvx } from '@dotenvx/dotenvx'; 
// Alternatively, if you are using standard dotenv, pass the path config option:
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // 👈 Directs Prisma to look inside .env.local

import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});