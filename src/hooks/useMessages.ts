import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  shift_id: string | null;
  created_at: string;
}

export interface Conversation {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
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
        { event: "*", schema: "public", table: "messages" },
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
        conv.messages.push(msg);
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
          last_message: lastMsg.content,
          last_message_time: lastMsg.created_at,
          unread_count: conv.unread,
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

export function useChatMessages(partnerId: string | undefined) {
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
            queryClient.invalidateQueries({ queryKey: ["chat", partnerId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, queryClient]);

  return useQuery({
    queryKey: ["chat", partnerId],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      if (!user || !partnerId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

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

      return data as Message[];
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
    }: {
      recipientId: string;
      content: string;
      shiftId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content,
        shift_id: shiftId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useAvailableUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["available-users"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user!.id);

      if (error) throw error;
      return data || [];
    },
  });
}
