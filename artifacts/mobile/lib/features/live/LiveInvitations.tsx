import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

type Invitation = {
  id: string;
  room_id: string;
  inviter_id: string;
  invitee_id: string;
  state: "pending" | "accepted" | "rejected";
  created_at: string;
};

type Inviter = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Props = {
  roomId: string;
  userId: string;
};

const PROMPT_MS = 5000;

export function LiveInvitations({ roomId, userId }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviters, setInviters] = useState<Record<string, Inviter>>({});
  const [visiblePromptId, setVisiblePromptId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const dismissedPromptIds = useRef(new Set<string>());
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInvitations = useCallback(async () => {
    const { data, error } = await supabase
      .from("live_invitations")
      .select("id,room_id,inviter_id,invitee_id,state,created_at")
      .eq("room_id", roomId)
      .eq("invitee_id", userId)
      .eq("state", "pending")
      .order("created_at", { ascending: false });

    if (error) return;

    const rows = (data ?? []) as Invitation[];
    setInvitations(rows);

    const ids = [...new Set(rows.map((row) => row.inviter_id))];
    if (ids.length === 0) {
      setInviters({});
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", ids);

    const next: Record<string, Inviter> = {};
    for (const profile of (profiles ?? []) as Inviter[]) {
      next[profile.id] = profile;
    }
    setInviters(next);
  }, [roomId, userId]);

  useEffect(() => {
    void loadInvitations();

    const channel = supabase
      .channel(`live:${roomId}:invitations:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_invitations",
          filter: `invitee_id=eq.${userId}`,
        },
        () => {
          void loadInvitations();
        },
      )
      .subscribe();

    return () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [loadInvitations, roomId, userId]);

  useEffect(() => {
    const newest = invitations[0];
    if (!newest) {
      setVisiblePromptId(null);
      return;
    }

    if (dismissedPromptIds.current.has(newest.id)) return;

    setVisiblePromptId(newest.id);

    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    promptTimerRef.current = setTimeout(() => {
      dismissedPromptIds.current.add(newest.id);
      setVisiblePromptId((current) =>
        current === newest.id ? null : current,
      );
    }, PROMPT_MS);

    return () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    };
  }, [invitations]);

  const respond = async (invitation: Invitation, accept: boolean) => {
    setRespondingId(invitation.id);
    try {
      const { error } = await supabase.rpc("live_respond_invitation", {
        p_invitation_id: invitation.id,
        p_accept: accept,
      });

      if (error) throw new Error(error.message);

      dismissedPromptIds.current.add(invitation.id);
      setVisiblePromptId((current) =>
        current === invitation.id ? null : current,
      );
      await loadInvitations();
    } finally {
      setRespondingId(null);
    }
  };

  const getInviterName = (inviterId: string) => {
    const profile = inviters[inviterId];
    if (!profile) return "Usuario";
    return (
      profile.full_name?.trim() ||
      (profile.username ? `@${profile.username}` : "Usuario")
    );
  };

  const visibleInvitation =
    invitations.find((invitation) => invitation.id === visiblePromptId) ?? null;

  return (
    <>
      <Pressable
        style={styles.iconButton}
        onPress={() => setListOpen((open) => !open)}
        accessibilityLabel="Invitaciones pendientes"
      >
        <Feather name="mail" size={18} color="#fff" />
        {invitations.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {invitations.length > 9 ? "9+" : invitations.length}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {visibleInvitation ? (
        <View style={styles.promptPosition}>
          <BlurView intensity={55} tint="dark" style={styles.prompt}>
            <View style={styles.promptHeader}>
              <View style={styles.iconCircle}>
                <Feather name="user-plus" size={18} color="#fff" />
              </View>
              <View style={styles.promptCopy}>
                <Text style={styles.promptTitle}>Invitación al LIVE</Text>
                <Text style={styles.promptText} numberOfLines={2}>
                  {getInviterName(visibleInvitation.inviter_id)} te invita a
                  participar como Guest.
                </Text>
              </View>
            </View>

            <View style={styles.promptActions}>
              <Pressable
                style={styles.rejectButton}
                onPress={() => void respond(visibleInvitation, false)}
                disabled={respondingId === visibleInvitation.id}
              >
                <Text style={styles.rejectText}>Rechazar</Text>
              </Pressable>
              <Pressable
                style={styles.acceptButton}
                onPress={() => void respond(visibleInvitation, true)}
                disabled={respondingId === visibleInvitation.id}
              >
                {respondingId === visibleInvitation.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptText}>Aceptar</Text>
                )}
              </Pressable>
            </View>
          </BlurView>
        </View>
      ) : null}

      {listOpen ? (
        <View style={styles.listPosition}>
          <BlurView intensity={65} tint="dark" style={styles.list}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Invitaciones</Text>
              <Pressable onPress={() => setListOpen(false)}>
                <Feather name="x" size={18} color="#fff" />
              </Pressable>
            </View>

            {invitations.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay invitaciones pendientes.
              </Text>
            ) : (
              invitations.map((invitation) => (
                <View key={invitation.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listName}>
                      {getInviterName(invitation.inviter_id)}
                    </Text>
                    <Text style={styles.listMeta}>Invitación pendiente</Text>
                  </View>
                  <View style={styles.listActions}>
                    <Pressable
                      style={styles.smallReject}
                      onPress={() => void respond(invitation, false)}
                      disabled={respondingId === invitation.id}
                    >
                      <Feather name="x" size={16} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={styles.smallAccept}
                      onPress={() => void respond(invitation, true)}
                      disabled={respondingId === invitation.id}
                    >
                      <Feather name="check" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </BlurView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  promptPosition: {
    position: "absolute",
    top: 50,
    right: 0,
    left: 0,
    alignItems: "center",
    zIndex: 20,
  },
  prompt: {
    width: "92%",
    maxWidth: 420,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 16,
    backgroundColor: "rgba(20,20,24,0.68)",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promptCopy: {
    flex: 1,
  },
  promptTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  promptText: {
    color: "#d5d5d8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  promptActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },
  rejectButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  rejectText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  acceptButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FE2C55",
  },
  acceptText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  listPosition: {
    position: "absolute",
    top: 50,
    right: 0,
    zIndex: 21,
    width: "88%",
    maxWidth: 360,
  },
  list: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(20,20,24,0.72)",
    padding: 14,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: "#aaa",
    fontSize: 12,
    paddingVertical: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  listCopy: {
    flex: 1,
    paddingRight: 8,
  },
  listName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  listMeta: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
  },
  listActions: {
    flexDirection: "row",
    gap: 6,
  },
  smallReject: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  smallAccept: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
  },
});
