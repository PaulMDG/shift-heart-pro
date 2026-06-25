import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { formatRelativeTime } from "@/lib/format";

type ErrRow = {
  id: string;
  source: string;
  target_user_id: string | null;
  payload: any;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
};

export default function AdminNotificationErrors() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notification-errors"],
    queryFn: async (): Promise<ErrRow[]> => {
      const { data, error } = await supabase
        .from("notification_errors" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const clearOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_errors" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Error log removed");
      qc.invalidateQueries({ queryKey: ["notification-errors"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to remove"),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notification_errors" as any)
        .delete()
        .not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All error logs cleared");
      qc.invalidateQueries({ queryKey: ["notification-errors"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to clear"),
  });

  useEffect(() => {
    const ch = supabase
      .channel("notification_errors_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_errors" },
        () => qc.invalidateQueries({ queryKey: ["notification-errors"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <div className="min-h-screen bg-canvas text-canvas-foreground max-w-2xl mx-auto">
      <div className="sticky top-0 z-40 bg-surface border-b border-[hsl(var(--ivory-border))] px-5 py-4 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="focus-ring w-11 h-11 -ml-2 rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Notification errors</h1>
            <p className="text-[11px] text-muted-foreground">
              Failed notification inserts logged by the database trigger
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          {data.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : data.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 text-center border border-[hsl(var(--ivory-border))] shadow-soft">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-muted-foreground/60" />
            <p className="text-sm font-semibold">No notification errors</p>
            <p className="text-xs text-muted-foreground mt-1">
              Failed notification inserts will be captured here with the offending payload.
            </p>
          </div>
        ) : (
          data.map((row) => {
            const open = openId === row.id;
            return (
              <div
                key={row.id}
                className="bg-surface rounded-2xl p-4 shadow-soft border border-l-4 border-l-destructive border-[hsl(var(--ivory-border))]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{row.source}</p>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted shrink-0">
                        {row.error_code || "—"}
                      </span>
                    </div>
                    <p className="text-xs text-destructive mt-0.5 break-words">
                      {row.error_message || "Unknown error"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(row.created_at)}
                      </p>
                      <button
                        onClick={() => setOpenId(open ? null : row.id)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {open ? "Hide" : "Show"} payload
                      </button>
                      <button
                        onClick={() => clearOne.mutate(row.id)}
                        disabled={clearOne.isPending}
                        className="text-[11px] text-muted-foreground hover:text-destructive ml-auto inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Dismiss
                      </button>
                    </div>
                    {open && (
                      <pre className="mt-2 text-[11px] bg-muted/50 rounded-lg p-2 overflow-x-auto max-h-64">
                        {JSON.stringify(row.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}