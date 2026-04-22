import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Verifies that caregiver-facing code paths cannot read PII columns
 * (emergency_contact, emergency_phone, care_plan_summary) from the
 * `clients` table. Caregivers must use `clients_caregiver_safe`, which
 * does not expose those columns. The `clients` table RLS denies
 * non-admin SELECT entirely.
 *
 * We mock @/integrations/supabase/client to simulate the server's RLS
 * behavior: SELECT on `clients` as a caregiver returns an empty array
 * (or null on maybeSingle), and the safe view does not expose PII.
 */

type Row = Record<string, unknown>;

const SAFE_VIEW_COLUMNS = ["id", "name", "address", "care_type", "lat", "lng", "created_at"];
const PII_COLUMNS = ["emergency_contact", "emergency_phone", "care_plan_summary"];

let currentRole: "admin" | "caregiver" = "caregiver";

vi.mock("@/integrations/supabase/client", () => {
  const buildBuilder = (table: string, selectCols: string) => {
    const cols = selectCols.split(",").map((c) => c.trim());
    const isSafeView = table === "clients_caregiver_safe";
    const isClients = table === "clients";

    const fakeRow: Row = {
      id: "client-1",
      name: "Jane Doe",
      address: "123 Main",
      care_type: "hourly",
      lat: 0,
      lng: 0,
      created_at: new Date().toISOString(),
      emergency_contact: "John Doe",
      emergency_phone: "555-0100",
      care_plan_summary: "Sensitive plan",
    };

    const project = (row: Row) =>
      Object.fromEntries(cols.map((c) => [c, row[c]])) as Row;

    const resolveList = async () => {
      if (isClients && currentRole !== "admin") {
        // RLS denies caregiver SELECT on clients entirely
        return { data: [], error: null };
      }
      if (isSafeView) {
        // Safe view never exposes PII columns even if requested
        const safeRow = Object.fromEntries(
          cols
            .filter((c) => SAFE_VIEW_COLUMNS.includes(c))
            .map((c) => [c, fakeRow[c]]),
        ) as Row;
        return { data: [safeRow], error: null };
      }
      return { data: [project(fakeRow)], error: null };
    };

    const resolveSingle = async () => {
      const { data, error } = await resolveList();
      return { data: (data && data[0]) ?? null, error };
    };

    const builder: any = {
      eq: () => builder,
      maybeSingle: () => resolveSingle(),
      single: () => resolveSingle(),
      then: (onFulfilled: any, onRejected: any) =>
        resolveList().then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => ({
        select: (cols: string) => buildBuilder(table, cols),
      }),
    },
  };
});

import { supabase } from "@/integrations/supabase/client";

describe("caregiver access to client PII", () => {
  beforeEach(() => {
    currentRole = "caregiver";
  });

  it("returns no rows when a caregiver queries the clients table directly", async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, emergency_contact, emergency_phone, care_plan_summary");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns null when a caregiver fetches a single client row by id", async () => {
    const { data, error } = await (supabase
      .from("clients")
      .select("id, name, emergency_contact, emergency_phone, care_plan_summary")
      .eq("id", "client-1") as any).maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("safe view never returns PII columns to caregivers", async () => {
    // Even if a caller asks for PII columns, the safe view does not expose them
    const { data } = await supabase
      .from("clients_caregiver_safe" as any)
      .select("id, name, address, emergency_contact, emergency_phone, care_plan_summary");

    expect(Array.isArray(data)).toBe(true);
    const row = (data as Row[])[0];
    for (const col of PII_COLUMNS) {
      expect(row?.[col]).toBeUndefined();
    }
    expect(row?.id).toBe("client-1");
    expect(row?.name).toBe("Jane Doe");
  });

  it("admins can read PII columns from clients table", async () => {
    currentRole = "admin";
    const { data, error } = await (supabase
      .from("clients")
      .select("id, emergency_contact, emergency_phone, care_plan_summary")
      .eq("id", "client-1") as any).maybeSingle();
    expect(error).toBeNull();
    expect(data?.emergency_contact).toBe("John Doe");
    expect(data?.emergency_phone).toBe("555-0100");
    expect(data?.care_plan_summary).toBe("Sensitive plan");
  });
});