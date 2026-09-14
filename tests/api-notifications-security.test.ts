import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("artifacts/api-server/src/routes/notifications.ts", "utf8");

describe("API notification security invariants", () => {
  it("requires an authenticated Supabase user before using the service role", () => {
    expect(source).toMatch(/Authorization/i);
    expect(source).toMatch(/auth\.getUser/i);
    expect(source).toMatch(/401/);
  });

  it("does not trust actor identity supplied by the request body", () => {
    expect(source).toMatch(/auth.*user.*id/is);
    expect(source).toMatch(/actorId.*user\.id|user\.id.*actorId/is);
  });

  it("does not expose the service-role insert path without authentication", () => {
    expect(source).toMatch(/serviceKey/i);
    expect(source).toMatch(/Authorization/i);
    expect(source).toMatch(/auth\.getUser/i);
  });
});
