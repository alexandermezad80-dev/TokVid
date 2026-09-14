export interface ShareVideoInput {
  videoId: string;
}

export interface ShareVideoClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: { shares_count: number | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

export interface ShareVideoResult {
  shared: boolean;
  error: string | null;
}

function validateInput(input: ShareVideoInput): string | null {
  if (!input.videoId.trim()) return "Faltan datos obligatorios";
  return null;
}

export async function shareVideo(
  input: ShareVideoInput,
  client: ShareVideoClient,
): Promise<ShareVideoResult> {
  const validationError = validateInput(input);
  if (validationError) return { shared: false, error: validationError };

  try {
    const { data, error } = await client
      .from("videos")
      .select("shares_count")
      .eq("id", input.videoId)
      .maybeSingle();

    if (error) return { shared: false, error: error.message };
    if (!data) return { shared: false, error: "No se encontró el video" };

    const { error: updateError } = await client
      .from("videos")
      .update({ shares_count: (data.shares_count ?? 0) + 1 })
      .eq("id", input.videoId);

    if (updateError) return { shared: false, error: updateError.message };

    return { shared: true, error: null };
  } catch {
    return { shared: false, error: "No se pudo registrar el compartir" };
  }
}
