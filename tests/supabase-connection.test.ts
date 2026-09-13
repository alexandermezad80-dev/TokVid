import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { mockQuery, mockCreateClient } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreateClient: vi.fn(),
}));

function createFakeClient(): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: mockQuery,
      })),
    })),
  } as unknown as SupabaseClient;
}

import {
  checkSupabaseConnection,
  getSupabaseAdmin,
} from "../artifacts/api-server/src/lib/supabaseConnection";

describe("Supabase connection module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockCreateClient.mockReturnValue(createFakeClient());
  });

  it("creates the client using environment variables", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    getSupabaseAdmin(mockCreateClient);

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  });

  it("fails gracefully when credentials are missing", async () => {
    const result = await checkSupabaseConnection(mockCreateClient);

    expect(result.ok).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY"),
      }),
    );
  });

  it("reports a successful database connection", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    mockQuery.mockResolvedValue({ data: [], error: null });

    const result = await checkSupabaseConnection(mockCreateClient);

    expect(result).toEqual({ ok: true });
  });

  it("reports a database failure without throwing", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    mockQuery.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    const result = await checkSupabaseConnection(mockCreateClient);

    expect(result).toEqual({ ok: false, error: "Invalid API key" });
  });
});
