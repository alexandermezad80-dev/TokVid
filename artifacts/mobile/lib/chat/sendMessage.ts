export interface SendMessageInput {
  userId: string;
  conversationId: string;
  text: string;
}

export interface MessageClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string } | null;
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

export interface SendMessageResult {
  error: string | null;
  messageId?: string;
}

function validateInput(input: SendMessageInput): string | null {
  if (!input.userId.trim() || !input.conversationId.trim()) {
    return "Faltan datos obligatorios";
  }

  const text = input.text.trim();
  if (!text) return "El mensaje no puede estar vacío";
  if (text.length > 1000) return "El mensaje no puede superar los 1000 caracteres";

  return null;
}

export async function sendMessage(
  input: SendMessageInput,
  client: MessageClient,
): Promise<SendMessageResult> {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  const text = input.text.trim();

  try {
    const { data, error } = await client.from("messages").insert({
      conversation_id: input.conversationId,
      sender_id: input.userId,
      text,
    }).select("id").single();

    if (error) return { error: error.message };
    if (!data?.id) return { error: "No se pudo enviar el mensaje" };

    const { error: conversationError } = await client
      .from("conversations")
      .update({ last_message: text, last_message_at: new Date().toISOString() })
      .eq("id", input.conversationId);

    if (conversationError) return { error: conversationError.message, messageId: data.id };

    return { error: null, messageId: data.id };
  } catch {
    return { error: "No se pudo enviar el mensaje" };
  }
}
