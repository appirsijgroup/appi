import { drizzle } from "drizzle-orm/node-postgres";
import pool from "@/lib/db";
import * as schema from "./schema";
import * as relations from "./relations";

// Initialize Drizzle with the existing pool and schema
export const db = drizzle(pool, {
    schema: {
        ...schema,
        ...relations
    }
});
