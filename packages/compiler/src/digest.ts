import { createHash } from "node:crypto";

export function digestJson(value: unknown): string {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return `sha256:${createHash("sha256").update(json).digest("hex")}`;
}
