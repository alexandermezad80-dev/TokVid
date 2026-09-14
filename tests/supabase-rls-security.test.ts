import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("artifacts/mobile/supabase/new-tables.sql", "utf8");
const setup = readFileSync("artifacts/mobile/supabase/setup.sql", "utf8");
const notifications = readFileSync("artifacts/mobile/supabase/notifications.sql", "utf8");

function policyBlock(name: string, source: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `CREATE POLICY \\"${escaped}\\"[\\s\\S]*?(?=\\nCREATE POLICY|\\nALTER TABLE|\\nCREATE TABLE|\\n-- \\d+\\.)`,
    "i",
  ).exec(source);
  return match?.[0] ?? "";
}

describe("Supabase RLS security invariants", () => {
  it("does not let a conversation participant change authoritative conversation membership", () => {
    const block = policyBlock("participant update convos", sql);
    expect(block).toMatch(/FOR UPDATE/i);
    expect(block).toMatch(/WITH CHECK/i);
    expect(sql).toMatch(/protect_conversation_membership/i);
  });

  it("does not let a participant rewrite another user's message", () => {
    const block = policyBlock("participant update messages", sql);
    expect(block).toMatch(/auth\.uid\(\)\s*=\s*sender_id/i);
    expect(block).toMatch(/WITH CHECK/i);
    expect(sql).toMatch(/protect_message_authoritative_fields/i);
  });

  it("does not allow arbitrary authenticated users to update hashtags", () => {
    const block = policyBlock("authenticated hashtag update", sql);
    expect(block).toMatch(/USING\s*\(false\).*WITH CHECK\s*\(false\)/is);
  });

  it("does not allow arbitrary authenticated users to change profile-owned counters", () => {
    const block = policyBlock("Users can update their own profile", setup);
    expect(block).toMatch(/WITH CHECK/i);
    expect(block).toMatch(/auth\.uid\(\)\s*=\s*id/i);
    expect(setup).toMatch(/protect_profile_authoritative_fields/i);
  });

  it("allows notification reads only for the owner and protects notification content", () => {
    expect(notifications).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    expect(notifications).toMatch(/WITH CHECK\s*\(auth\.uid\(\)\s*=\s*user_id\)/i);
    expect(notifications).toMatch(/protect_notification_authoritative_fields/i);
  });
});
