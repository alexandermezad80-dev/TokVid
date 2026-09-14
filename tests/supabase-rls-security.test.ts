import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("artifacts/mobile/supabase/new-tables.sql", "utf8");
const setup = readFileSync("artifacts/mobile/supabase/setup.sql", "utf8");

function policyBlock(name: string, table: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `CREATE POLICY \\"${escaped}\\"[\\s\\S]*?(?=\\nCREATE POLICY|\\nALTER TABLE|\\nCREATE TABLE|\\n-- \\d+\\.)`,
    "i",
  ).exec(table === "new" ? sql : setup);
  return match?.[0] ?? "";
}

describe("Supabase RLS security invariants", () => {
  it("does not let a conversation participant change authoritative conversation membership", () => {
    const block = policyBlock("participant update convos", "new");
    expect(block).toMatch(/FOR UPDATE/i);
    expect(block).toMatch(/WITH CHECK/i);
    expect(block).toMatch(/user1_id = auth\.uid\(\).*user2_id = auth\.uid\(\)/is);
  });

  it("does not let a participant rewrite another user's message", () => {
    const block = policyBlock("participant update messages", "new");
    expect(block).toMatch(/auth\.uid\(\)\s*=\s*sender_id/i);
    expect(block).toMatch(/WITH CHECK/i);
  });

  it("does not allow arbitrary authenticated users to update hashtags", () => {
    const block = policyBlock("auth update hashtags", "new");
    expect(block).not.toMatch(/USING\s*\(true\).*WITH CHECK\s*\(true\)/is);
  });

  it("does not allow arbitrary authenticated users to change profile-owned counters", () => {
    const block = policyBlock("Users can update their own profile", "setup");
    expect(block).toMatch(/WITH CHECK/i);
    expect(block).toMatch(/auth\.uid\(\)\s*=\s*id/i);
  });
});
