import { createHash } from "node:crypto";

export function getSessionCacheKey(accessToken: string): string {
  const tokenHash = createHash("sha256").update(accessToken).digest("hex");
  return `sessionToken:${tokenHash}`;
}
