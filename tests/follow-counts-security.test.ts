import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const follows = readFileSync("artifacts/mobile/supabase/follows.sql", "utf8");
const completeSetup = readFileSync("artifacts/mobile/supabase/complete-setup.sql", "utf8");

function assertHardened(source: string) {
  expect(source).toMatch(
    /CREATE OR REPLACE FUNCTION (?:public\.)?update_follow_counts\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public/i,
  );
  expect(source).toMatch(
    /REVOKE EXECUTE ON FUNCTION (?:public\.)?update_follow_counts\(\) FROM anon;/i,
  );
  expect(source).toMatch(
    /REVOKE EXECUTE ON FUNCTION (?:public\.)?update_follow_counts\(\) FROM authenticated;/i,
  );
  expect(source).toMatch(
    /AFTER INSERT OR DELETE ON (?:public\.)?follows[\s\S]*?EXECUTE FUNCTION (?:public\.)?update_follow_counts\(\)/i,
  );
}

describe("Supabase follow-count security invariants", () => {
  it("keeps update_follow_counts trigger-only and removes public RPC execution", () => {
    assertHardened(follows);
  });

  it("keeps the complete Supabase setup hardened", () => {
    assertHardened(completeSetup);
  });
});
