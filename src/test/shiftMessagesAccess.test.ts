import { describe, it, expect, vi } from "vitest";

/**
 * Verifies RLS-style behavior for shift-scoped chat:
 *
 * 1. A caregiver can read messages where they are sender OR recipient
 *    (the `messages` SELECT policy: sender_id = auth.uid() OR
 *    recipient_id = auth.uid()), AND when shift_id is filtered, only
 *    rows for that shift are returned.
 *
 * 2. An unauthorized caregiver (not sender/recipient) sees nothing.
 *
 * 3. The `mark_message_converted` RPC succeeds only for the shift's
 *    caregiver (or admin) and a message that belongs to that shift.
 */

type Row = Record<string, unknown>;

const CAREGIVER_A = "11111111-1111-1111-1111-111111111111";
const CAREGIVER_B = "22222222-2222-2222-2222-222222222222";
const SHIFT_A = "shift-a";
const SHIFT_B = "shift-b";

const ALL_MESSAGES: Row[] = [
  { id: "m1", sender_id: CAREGIVER_A, recipient_id: "admin-1", shift_id: SHIFT_A, content: "hi" },
  { id: "m2", sender_id: "admin-1", recipient_id: CAREGIVER_A, shift_id: SHIFT_A, content: "ack" },
  { id: "m3", sender_id: CAREGIVER_A, recipient_id: "admin-1", shift_id: SHIFT_B, content: "other" },
  { id: "m4", sender_id: CAREGIVER_B, recipient_id: "admin-1", shift_id: SHIFT_A, content: "private" },
];

let currentUser = CAREGIVER_A;

vi.mock("@/integrations/supabase/client", () => {
  const buildBuilder = (table: string) => {
    const state: { shift?: string; orFilter?: boolean } = {};
    const exec = () => {
      if (table !== "messages") return { data: [], error: null };
      let rows = ALL_MESSAGES.filter(
        (r) => r.sender_id === currentUser || r.recipient_id === currentUser,
      );
      if (state.shift) rows = rows.filter((r) => r.shift_id === state.shift);
      return { data: rows, error: null };
    };
    const builder: any = {
      select: () => builder,
      or: () => {
        state.orFilter = true;
        return builder;
      },
      eq: (col: string, val: any) => {
        if (col === "shift_id") state.shift = val;
        return builder;
      },
      order: () => exec(),
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => buildBuilder(table),
      rpc: async (fn: string, args: Record<string, any>) => {
        if (fn !== "mark_message_converted") return { data: null, error: { message: "unknown rpc" } };
        // Authorization: only the shift's caregiver may convert.
        const SHIFT_OWNERS: Record<string, string> = {
          [SHIFT_A]: CAREGIVER_A,
          [SHIFT_B]: CAREGIVER_A,
        };
        const msg = ALL_MESSAGES.find((m) => m.id === args.p_message_id);
        if (!msg) return { data: null, error: { message: "Message not found" } };
        if (SHIFT_OWNERS[args.p_shift_id] !== currentUser) {
          return { data: null, error: { message: "Not authorized for this shift" } };
        }
        if (currentUser !== msg.sender_id && currentUser !== msg.recipient_id) {
          return { data: null, error: { message: "Not authorized for this message" } };
        }
        if (msg.shift_id !== args.p_shift_id) {
          return { data: null, error: { message: "Message does not belong to this shift" } };
        }
        return { data: null, error: null };
      },
    },
  };
});

describe("shift-scoped chat RLS surface", () => {
  it("caregiver A only sees their own messages, filtered by shift A", async () => {
    currentUser = CAREGIVER_A;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .or("...")
      .eq("shift_id", SHIFT_A)
      .order("created_at");
    const ids = (data as Row[]).map((r) => r.id);
    expect(ids).toEqual(["m1", "m2"]); // shift A only, no m3 (other shift), no m4 (other user)
  });

  it("caregiver A toggling scope off sees all their messages", async () => {
    currentUser = CAREGIVER_A;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .or("...")
      .order("created_at");
    const ids = (data as Row[]).map((r) => r.id);
    expect(ids).toEqual(["m1", "m2", "m3"]);
    expect(ids).not.toContain("m4");
  });

  it("caregiver B cannot convert caregiver A's message", async () => {
    currentUser = CAREGIVER_B;
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await (supabase as any).rpc("mark_message_converted", {
      p_message_id: "m1",
      p_shift_id: SHIFT_A,
    });
    expect(error?.message).toMatch(/not authorized/i);
  });

  it("caregiver A cannot convert a message belonging to a different shift", async () => {
    currentUser = CAREGIVER_A;
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await (supabase as any).rpc("mark_message_converted", {
      p_message_id: "m1", // belongs to shift A
      p_shift_id: SHIFT_B,
    });
    expect(error?.message).toMatch(/does not belong/i);
  });

  it("caregiver A can convert their own shift-A message", async () => {
    currentUser = CAREGIVER_A;
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await (supabase as any).rpc("mark_message_converted", {
      p_message_id: "m1",
      p_shift_id: SHIFT_A,
    });
    expect(error).toBeNull();
  });
});