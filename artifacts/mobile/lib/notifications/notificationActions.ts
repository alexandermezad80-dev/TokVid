export interface NotificationClient {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

export interface NotificationActionResult {
  error: string | null;
}

function validateId(id: string): string | null {
  return id.trim() ? null : "Faltan datos obligatorios";
}

export async function markNotificationRead(
  notificationId: string,
  client: NotificationClient,
): Promise<NotificationActionResult> {
  const validationError = validateId(notificationId);
  if (validationError) return { error: validationError };

  try {
    const { error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    return error ? { error: error.message } : { error: null };
  } catch {
    return { error: "No se pudo marcar la notificación como leída" };
  }
}

export async function markAllNotificationsRead(
  userId: string,
  client: NotificationClient,
): Promise<NotificationActionResult> {
  const validationError = validateId(userId);
  if (validationError) return { error: validationError };

  try {
    const { error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId);

    return error ? { error: error.message } : { error: null };
  } catch {
    return { error: "No se pudieron marcar las notificaciones como leídas" };
  }
}
