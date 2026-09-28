import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Permission =
  | "invite_guests"
  | "manage_requests"
  | "manage_participants"
  | "manage_chat"
  | "remove_users"
  | "mute_users"
  | "block_users";

type Participant = {
  user_id: string;
  role: "host" | "guest" | "spectator";
  participation_state: string;
  camera_authorized: boolean;
  mic_authorized: boolean;
  camera_state: "on" | "off";
  mic_state: "on" | "off";
  mic_moderation_blocked: boolean;
};

type JoinRequest = {
  id: string;
  requester_id: string;
  state: string;
};

type Moderator = {
  user_id: string;
  permissions: Record<Permission, boolean>;
};

const permissionLabels: Record<Permission, string> = {
  invite_guests: "Invitar Guests",
  manage_requests: "Gestionar solicitudes",
  manage_participants: "Gestionar participantes",
  manage_chat: "Gestionar chat",
  remove_users: "Expulsar usuarios",
  mute_users: "Silenciar Guests",
  block_users: "Bloquear usuarios",
};

const permissions: Permission[] = [
  "invite_guests",
  "manage_requests",
  "manage_participants",
  "manage_chat",
  "remove_users",
  "mute_users",
  "block_users",
];

const emptyPermissions = (): Record<Permission, boolean> =>
  Object.fromEntries(permissions.map((permission) => [permission, false])) as Record<
    Permission,
    boolean
  >;

export default function LiveManage() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { user } = useAuth();
  const [roomHostId, setRoomHostId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [ownPermissions, setOwnPermissions] = useState<Record<Permission, boolean>>(
    emptyPermissions(),
  );
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedModerator, setSelectedModerator] = useState<string | null>(null);
  const [moderatorPermissions, setModeratorPermissions] =
    useState<Record<Permission, boolean>>(emptyPermissions());

  const isHost = Boolean(user?.id && roomHostId === user.id);
  const can = useCallback(
    (permission: Permission) => isHost || ownPermissions[permission],
    [isHost, ownPermissions],
  );

  const refresh = useCallback(async () => {
    if (!roomId || !user?.id) return;

    const [
      { data: room, error: roomError },
      { data: participantRows, error: participantError },
      { data: requestRows, error: requestError },
      { data: moderatorRows, error: moderatorError },
    ] = await Promise.all([
      supabase.from("live_rooms").select("host_id,state,mode").eq("id", roomId).maybeSingle(),
      supabase
        .from("live_participants")
        .select(
          "user_id,role,participation_state,camera_authorized,mic_authorized,camera_state,mic_state,mic_moderation_blocked",
        )
        .eq("room_id", roomId)
        .in("participation_state", [
          "active",
          "spectator",
          "pending_request",
          "pending_invitation",
        ]),
      supabase
        .from("live_join_requests")
        .select("id,requester_id,state")
        .eq("room_id", roomId)
        .eq("state", "pending"),
      supabase
        .from("live_moderators")
        .select("user_id,permissions")
        .eq("room_id", roomId)
        .is("revoked_at", null),
    ]);

    if (roomError) throw new Error(roomError.message);
    if (participantError) throw new Error(participantError.message);
    if (requestError) throw new Error(requestError.message);
    if (moderatorError) throw new Error(moderatorError.message);
    if (!room || room.state !== "active") throw new Error("LIVE no está activo.");

    setRoomHostId(room.host_id);
    setParticipants((participantRows ?? []) as Participant[]);
    setRequests((requestRows ?? []) as JoinRequest[]);

    const normalizedModerators = (moderatorRows ?? []).map((row) => ({
      user_id: row.user_id,
      permissions: { ...emptyPermissions(), ...(row.permissions ?? {}) },
    })) as Moderator[];
    setModerators(normalizedModerators);

    const ownModerator = normalizedModerators.find((moderator) => moderator.user_id === user.id);
    setOwnPermissions(ownModerator?.permissions ?? emptyPermissions());

    if (selectedModerator) {
      const selected = normalizedModerators.find(
        (moderator) => moderator.user_id === selectedModerator,
      );
      if (selected) setModeratorPermissions(selected.permissions);
    }
  }, [roomId, user?.id, selectedModerator]);

  useEffect(() => {
    void refresh().catch((error) => Alert.alert("Gestión LIVE", error.message));
  }, [refresh]);

  const activeGuests = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.role === "guest" && participant.participation_state === "active",
      ),
    [participants],
  );

  const activeSpectators = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.role === "spectator" && participant.participation_state === "spectator",
      ),
    [participants],
  );

  const callRpc = async (key: string, fn: string, args: Record<string, unknown>) => {
    if (busy) return;
    setBusy(key);
    try {
      const { error } = await supabase.rpc(fn, args);
      if (error) throw new Error(error.message);
      await refresh();
    } catch (error) {
      Alert.alert("Gestión LIVE", error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(null);
    }
  };

  const decideRequest = async (requestId: string, accept: boolean) => {
    await callRpc(
      requestId + (accept ? ":accept" : ":reject"),
      "live_decide_join_request",
      { p_request_id: requestId, p_accept: accept },
    );
  };

  const inviteGuest = async () => {
    const value = username.trim();
    if (!roomId || !value || !can("invite_guests")) return;

    setBusy("invite");
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,full_name")
        .eq("username", value)
        .maybeSingle();

      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error("No se encontró un usuario con ese username.");
      if (profile.id === user?.id) throw new Error("No puedes invitarte a ti mismo.");

      const { error } = await supabase.rpc("live_invite_guest", {
        p_room_id: roomId,
        p_invitee_id: profile.id,
      });
      if (error) throw new Error(error.message);

      setUsername("");
      Alert.alert("Invitación enviada", "La invitación quedó pendiente para el usuario.");
      await refresh();
    } catch (error) {
      Alert.alert("Invitar Guest", error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(null);
    }
  };

  const setDeviceAuthorization = async (
    participant: Participant,
    cameraAuthorized: boolean,
    micAuthorized: boolean,
  ) => {
    await callRpc(
      participant.user_id + ":devices",
      "live_set_device_authorization",
      {
        p_room_id: roomId,
        p_user_id: participant.user_id,
        p_camera_authorized: cameraAuthorized,
        p_mic_authorized: micAuthorized,
      },
    );
  };

  const removeParticipant = async (participant: Participant) => {
    await callRpc(
      participant.user_id + ":remove",
      "live_remove_participant",
      { p_room_id: roomId, p_user_id: participant.user_id },
    );
  };

  const toggleMute = async (participant: Participant) => {
    await callRpc(
      participant.user_id + ":mute",
      participant.mic_moderation_blocked ? "live_unmute_participant" : "live_mute_participant",
      { p_room_id: roomId, p_user_id: participant.user_id },
    );
  };

  const toggleBlock = async (participant: Participant) => {
    await callRpc(
      participant.user_id + ":block",
      "live_block_user",
      { p_room_id: roomId, p_user_id: participant.user_id },
    );
  };

  const grantModerator = async (participantId: string) => {
    if (!roomId || !isHost) return;
    await callRpc(
      participantId + ":moderator",
      "live_grant_moderator",
      {
        p_room_id: roomId,
        p_user_id: participantId,
        p_permissions: moderatorPermissions,
      },
    );
  };

  const revokeModerator = async (participantId: string) => {
    if (!roomId || !isHost) return;
    await callRpc(
      participantId + ":revoke",
      "live_revoke_moderator",
      { p_room_id: roomId, p_user_id: participantId },
    );
    if (selectedModerator === participantId) {
      setSelectedModerator(null);
      setModeratorPermissions(emptyPermissions());
    }
  };

  const updateModeratorPermissions = async (participantId: string) => {
    if (!roomId || !isHost) return;
    await callRpc(
      participantId + ":permissions",
      "live_update_moderator_permissions",
      {
        p_room_id: roomId,
        p_user_id: participantId,
        p_permissions: moderatorPermissions,
      },
    );
  };

  const toggleModeratorPermission = (permission: Permission) => {
    setModeratorPermissions((current) => ({
      ...current,
      [permission]: !current[permission],
    }));
  };

  const selectedModeratorIsActive = Boolean(
    selectedModerator && moderators.some((moderator) => moderator.user_id === selectedModerator),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Gestión LIVE</Text>
        <Pressable onPress={() => void refresh()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Actualizar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {can("invite_guests") ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Invitar Guest</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="username exacto"
              placeholderTextColor="#777"
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable
              style={styles.primaryButton}
              onPress={() => void inviteGuest()}
              disabled={busy === "invite"}
            >
              <Text style={styles.buttonText}>
                {busy === "invite" ? "Enviando…" : "Enviar invitación"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {can("manage_requests") ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Solicitudes pendientes ({requests.length})</Text>
            {requests.length === 0 ? (
              <Text style={styles.muted}>No hay solicitudes pendientes.</Text>
            ) : (
              requests.map((request) => (
                <View key={request.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{request.requester_id}</Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.smallPrimary}
                      onPress={() => void decideRequest(request.id, true)}
                      disabled={busy !== null}
                    >
                      <Text style={styles.buttonText}>Aceptar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallSecondary}
                      onPress={() => void decideRequest(request.id, false)}
                      disabled={busy !== null}
                    >
                      <Text style={styles.buttonText}>Rechazar</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {can("manage_participants") || can("remove_users") || can("mute_users") || can("block_users") ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Guests activos ({activeGuests.length})</Text>
            {activeGuests.length === 0 ? (
              <Text style={styles.muted}>No hay Guests activos.</Text>
            ) : (
              activeGuests.map((participant) => (
                <View key={participant.user_id} style={styles.participant}>
                  <Text style={styles.rowTitle}>{participant.user_id}</Text>
                  <Text style={styles.muted}>
                    Cámara: {participant.camera_state === "on" ? "on" : "off"} · Mic:{" "}
                    {participant.mic_state === "on" ? "on" : "off"}
                  </Text>

                  {can("manage_participants") ? (
                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() =>
                          void setDeviceAuthorization(
                            participant,
                            !participant.camera_authorized,
                            participant.mic_authorized,
                          )
                        }
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>
                          Cámara {participant.camera_authorized ? "revocar" : "autorizar"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() =>
                          void setDeviceAuthorization(
                            participant,
                            participant.camera_authorized,
                            !participant.mic_authorized,
                          )
                        }
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>
                          Mic {participant.mic_authorized ? "revocar" : "autorizar"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={styles.rowActions}>
                    {can("mute_users") ? (
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void toggleMute(participant)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>
                          {participant.mic_moderation_blocked ? "Permitir mic" : "Silenciar"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {can("remove_users") ? (
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void removeParticipant(participant)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Expulsar</Text>
                      </Pressable>
                    ) : null}
                    {can("block_users") ? (
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void toggleBlock(participant)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Bloquear</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {can("remove_users") || can("block_users") ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Espectadores ({activeSpectators.length})</Text>
            {activeSpectators.length === 0 ? (
              <Text style={styles.muted}>No hay espectadores en la lista.</Text>
            ) : (
              activeSpectators.map((participant) => (
                <View key={participant.user_id} style={styles.row}>
                  <Text style={styles.rowTitle}>{participant.user_id}</Text>
                  <View style={styles.rowActions}>
                    {can("remove_users") ? (
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void removeParticipant(participant)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Expulsar</Text>
                      </Pressable>
                    ) : null}
                    {can("block_users") ? (
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void toggleBlock(participant)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Bloquear</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {isHost ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Moderadores</Text>
            {moderators.map((moderator) => (
              <View key={moderator.user_id} style={styles.participant}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{moderator.user_id}</Text>
                  <Pressable
                    style={styles.smallSecondary}
                    onPress={() => {
                      setSelectedModerator(moderator.user_id);
                      setModeratorPermissions(moderator.permissions);
                    }}
                  >
                    <Text style={styles.buttonText}>
                      {selectedModerator === moderator.user_id ? "Seleccionado" : "Editar"}
                    </Text>
                  </Pressable>
                </View>

                {selectedModerator === moderator.user_id ? (
                  <>
                    <View style={styles.permissionList}>
                      {permissions.map((permission) => (
                        <Pressable
                          key={permission}
                          style={styles.permissionRow}
                          onPress={() => toggleModeratorPermission(permission)}
                        >
                          <Text style={styles.buttonText}>
                            {moderatorPermissions[permission] ? "✓" : "○"}{" "}
                            {permissionLabels[permission]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.smallPrimary}
                        onPress={() => void updateModeratorPermissions(moderator.user_id)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Guardar permisos</Text>
                      </Pressable>
                      <Pressable
                        style={styles.smallSecondary}
                        onPress={() => void revokeModerator(moderator.user_id)}
                        disabled={busy !== null}
                      >
                        <Text style={styles.buttonText}>Revocar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </View>
            ))}

            <Text style={styles.subTitle}>Asignar moderator a participante presente</Text>
            {participants
              .filter(
                (participant) =>
                  participant.user_id !== roomHostId &&
                  (participant.participation_state === "active" ||
                    participant.participation_state === "spectator"),
              )
              .map((participant) => (
                <View key={participant.user_id} style={styles.row}>
                  <Text style={styles.rowTitle}>{participant.user_id}</Text>
                  <Pressable
                    style={styles.smallPrimary}
                    onPress={() => void grantModerator(participant.user_id)}
                    disabled={busy !== null}
                  >
                    <Text style={styles.buttonText}>Asignar</Text>
                  </Pressable>
                </View>
              ))}

            {selectedModerator && selectedModeratorIsActive ? (
              <Text style={styles.muted}>
                Los permisos editados arriba se aplican al moderator seleccionado.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 52,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#0d0d0d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: { padding: 8 },
  headerButtonText: { color: "#fff", fontWeight: "700" },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  content: { padding: 12, gap: 12 },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#242424",
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  subTitle: { color: "#ddd", fontSize: 13, fontWeight: "700", marginTop: 8 },
  muted: { color: "#999", fontSize: 12 },
  input: {
    color: "#fff",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#333",
  },
  primaryButton: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  smallPrimary: {
    backgroundColor: "#FE2C55",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallSecondary: {
    backgroundColor: "#252525",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  row: {
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  participant: {
    padding: 10,
    backgroundColor: "#181818",
    borderRadius: 10,
    gap: 8,
  },
  rowTitle: { color: "#fff", fontSize: 12, fontWeight: "700", flex: 1 },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  permissionList: { gap: 5 },
  permissionRow: {
    backgroundColor: "#202020",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
