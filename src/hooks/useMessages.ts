import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { playMessageChime, isSoundEnabled } from "@/lib/notifySound";

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  shift_id: string | null;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_duration?: number | null;
  category?: string | null;
  pinned?: boolean | null;
  reactions?: Record<string, number> | unknown | null;
  voice_transcript?: string | null;
  converted_to_care_note_shift_id?: string | null;
  converted_to_care_note_at?: string | null;
  converted_to_care_note_by?: string | null;
}

export interface Conversation {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  category?: string;
}

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        () => {
          if (isSoundEnabled()) playMessageChime();
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["conversations"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Fetch all messages involving the current user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Group by conversation partner
      const convMap = new Map<string, { messages: Message[]; unread: number }>();
      for (const msg of messages) {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, { messages: [], unread: 0 });
        }
        const conv = convMap.get(partnerId)!;
        conv.messages.push(msg as unknown as Message);
        if (!msg.read && msg.recipient_id === user.id) {
          conv.unread++;
        }
      }

      // Fetch profiles for all conversation partners
      const partnerIds = Array.from(convMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", partnerIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      const conversations: Conversation[] = partnerIds.map((pid) => {
        const conv = convMap.get(pid)!;
        const profile = profileMap.get(pid);
        const lastMsg = conv.messages[0];
        return {
          user_id: pid,
          full_name: profile?.full_name || "Unknown User",
          avatar_url: profile?.avatar_url || null,
          last_message: lastMsg.content || attachmentSummary(lastMsg),
          last_message_time: lastMsg.created_at,
          unread_count: conv.unread,
          category: (lastMsg as any).category || "general",
        };
      });

      // Sort by most recent message
      conversations.sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      return conversations;
    },
  });
}

export function useChatMessages(partnerId: string | undefined, shiftId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for this chat
  useEffect(() => {
    if (!user || !partnerId) return;
    // Sort ids so both participants share the same channel topic
    const [a, b] = [user.id, partnerId].sort();
    const channel = supabase
      .channel(`chat-${a}-${b}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.recipient_id === partnerId) ||
            (msg.sender_id === partnerId && msg.recipient_id === user.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ["chat", partnerId, shiftId ?? null] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, shiftId, queryClient]);

  return useQuery({
    queryKey: ["chat", partnerId, shiftId ?? null],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      if (!user || !partnerId) return [];

      let q = supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
        );
      if (shiftId) q = q.eq("shift_id", shiftId);
      const { data, error } = await q.order("created_at", { ascending: true });

      if (error) throw error;

      // Mark unread messages as read
      const unreadIds = (data || [])
        .filter((m) => m.recipient_id === user.id && !m.read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }

      return data as unknown as Message[];
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientId,
      content,
      shiftId,
      category,
      attachment,
    }: {
      recipientId: string;
      content?: string;
      shiftId?: string;
      category?: string;
      attachment?: {
        url: string;
        type: string;
        name?: string;
        size?: number;
        duration?: number;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content: content ?? "",
        shift_id: shiftId || null,
        category: category || "general",
        attachment_url: attachment?.url ?? null,
        attachment_type: attachment?.type ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_size: attachment?.size ?? null,
        attachment_duration: attachment?.duration ?? null,
      } as any);

      if (error) throw error;

      // Best-effort push notification for shift-scoped messages
      if (shiftId) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              recipient_id: recipientId,
              shift_id: shiftId,
              preview: (content || (attachment ? "📎 Attachment" : "")).slice(0, 120),
              category: category || "general",
            },
          });
        } catch (e) {
          console.warn("[useSendMessage] push notify failed", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useConvertMessageToCareNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, shiftId }: { message: Message; shiftId: string }) => {
      const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const source = message.voice_transcript?.trim()
        || message.content?.trim()
        || (message.attachment_name ? `Attachment: ${message.attachment_name}` : "");
      if (!source) throw new Error("Nothing to convert");
      const line = `[${stamp} • from chat] ${source}`;

      const { data: shift, error: fetchErr } = await supabase
        .from("shifts")
        .select("clock_out_notes")
        .eq("id", shiftId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const existing = (shift?.clock_out_notes ?? "").trim();
      const next = existing ? `${existing}\n${line}` : line;

      const { error: updErr } = await supabase
        .from("shifts")
        .update({ clock_out_notes: next, updated_at: new Date().toISOString() })
        .eq("id", shiftId);
      if (updErr) throw updErr;

      // Mark message as converted (RLS-safe via SECURITY DEFINER RPC)
      const { error: rpcErr } = await supabase.rpc("mark_message_converted", {
        p_message_id: message.id,
        p_shift_id: shiftId,
      });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["shifts", vars.shiftId] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

function attachmentSummary(m: any): string {
  if (!m?.attachment_type) return "";
  if (m.attachment_type.startsWith("image/")) return "📷 Photo";
  if (m.attachment_type.startsWith("audio/")) return "🎙 Voice note";
  return `📎 ${m.attachment_name || "Document"}`;
}

export function useAvailableUsers(search: string = "") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["available-users", search],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_message_recipients", {
        search_text: search,
      });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string | null;
        phone: string | null;
      }>;
    },
  });
}

export function useMessageRecipient(userId: string | undefined) {
  return useQuery({
    queryKey: ["message-recipient", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_message_recipient", {
        _user_id: userId!,
      });
      if (error) throw error;
      const row = (data || [])[0];
      return (row || null) as {
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string | null;
        phone: string | null;
      } | null;
    },
  });
}
