export interface FindConversationInput {
  myId: string;
  otherId: string;
}

export interface ConversationClient {
  from: (table: string) => {
    select: (columns: string) => {
      or: (filters: string) => {
        limit: (count: number) => {
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface FindConversationResult {
  conversationId: string | null;
  error: string | null;
}

function validateInput(input: FindConversationInput): string | null {
  if (!input.myId.trim() || !input.otherId.trim()) {
    return "Faltan datos obligatorios";
  }
  if (input.myId === input.otherId) {
    return "No se puede crear una conversación contigo mismo";
  }
  return null;
}

export async function findOrCreateConversation(
  input: FindConversationInput,
  client: ConversationClient,
): Promise<FindConversationResult> {
  const validationError = validateInput(input);
  if (validationError) return { conversationId: null, error: validationError };

  try {
    const { data: existing, error: findError } = await client
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${input.myId},user2_id.eq.${input.otherId}),and(user1_id.eq.${input.otherId},user2_id.eq.${input.myId})`,
      )
      .limit(1)
      .maybeSingle();

    if (findError) return { conversationId: null, error: findError.message };
    if (existing?.id) return { conversationId: existing.id, error: null };

    const { data: created, error: createError } = await client
      .from("conversations")
      .insert({ user1_id: input.myId, user2_id: input.otherId })
      .select("id")
      .single();

    if (createError) return { conversationId: null, error: createError.message };
    if (!created?.id) return { conversationId: null, error: "No se pudo crear la conversación" };

    return { conversationId: created.id, error: null };
  } catch {
    return { conversationId: null, error: "No se pudo abrir la conversación" };
  }
}
