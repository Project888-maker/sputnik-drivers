import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A visitor's daily identity: a salted hash of their IP. The IP itself is never stored. */
export function visitorId(request: Request): string {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const salt = process.env.PLANNER_SECRET || "sputnik";
  return createHash("sha256").update(`${salt}:${today()}:${ip}`).digest("hex").slice(0, 32);
}
