import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("artifacts/mobile/supabase/new-tables.sql", "utf8");
const sendMessage = readFileSync("artifacts/mobile/lib/chat/sendMessage.ts", "utf8");

describe("Conversation metadata security invariants", () => {
  it("keeps conversation preview metadata server-controlled", () => {
    expect(sql).toMatch(/update_conversation_metadata_from_message/i);
    expect(sql).toMatch(/AFTER INSERT ON messages/i);
    expect(sql).toMatch(/last_message\s*=\s*NEW\.text/i);
    expect(sql).toMatch(/last_message_at\s*=\s*NEW\.created_at/i);
  });

  it("does not let the client directly rewrite conversation preview metadata", () => {
    expect(sendMessage).not.toMatch(/from\("conversations"\)[\s\S]*\.update\(/i);
  });
});
