import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Loader2, ClipboardList, Sparkles } from "lucide-react";
import {
  useCareTaskTemplates,
  useCreateCareTaskTemplate,
  useUpdateCareTaskTemplate,
  useDeleteCareTaskTemplate,
} from "@/hooks/useCareTaskTemplates";
import { useAllShifts, useAllClients } from "@/hooks/useAdmin";
import { useSeedShiftTasks } from "@/hooks/useShiftTasks";
import { toast } from "@/components/ui/sonner";

const AdminCareTasks = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useCareTaskTemplates();
  const create = useCreateCareTaskTemplate();
  const update = useUpdateCareTaskTemplate();
  const del = useDeleteCareTaskTemplate();
  const seed = useSeedShiftTasks();
  const { data: shifts = [] } = useAllShifts();
  const { data: clients = [] } = useAllClients();

  const [careType, setCareType] = useState("");
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState("0");

  const grouped = useMemo(() => {
    const map = new Map<string, typeof templates>();
    for (const t of templates) {
      const key = t.care_type || "(uncategorized)";
      if (!map.has(key)) map.set(key, [] as any);
      (map.get(key) as any).push(t);
    }
    return Array.from(map.entries());
  }, [templates]);

  const knownCareTypes = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) if (t.care_type) set.add(t.care_type);
    for (const c of clients as any[]) if (c.care_type) set.add(c.care_type);
    return Array.from(set).sort();
  }, [templates, clients]);

  const handleAdd = async () => {
    if (!careType.trim() || !label.trim()) {
      toast.error("Care type and label are required");
      return;
    }
    try {
      await create.mutateAsync({
        care_type: careType,
        label,
        sort_order: parseInt(order, 10) || 0,
      });
      setLabel("");
      toast.success("Task added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    }
  };

  const applyToUpcomingShifts = async (ct: string) => {
    const matchingClientIds = new Set(
      (clients as any[]).filter((c) => c.care_type === ct).map((c) => c.id),
    );
    const today = new Date().toISOString().split("T")[0];
    const targets = (shifts as any[]).filter(
      (s) => matchingClientIds.has(s.client_id) && s.date >= today && s.status !== "cancelled",
    );
    if (targets.length === 0) {
      toast.info("No upcoming shifts matched");
      return;
    }
    let added = 0;
    for (const s of targets) {
      try {
        const n = await seed.mutateAsync(s.id);
        added += n ?? 0;
      } catch {
        /* swallow per-shift errors */
      }
    }
    toast.success(`Seeded ${added} task${added === 1 ? "" : "s"} across ${targets.length} shift${targets.length === 1 ? "" : "s"}`);
  };

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/settings")}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Care Task Templates</h2>
            <p className="text-xs text-muted-foreground">
              Define default tasks per care type. They are auto-assigned to new shifts.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add task template
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Care type</Label>
              <Input
                value={careType}
                onChange={(e) => setCareType(e.target.value)}
                placeholder="e.g. Elderly Care"
                list="care-types"
              />
              <datalist id="care-types">
                {knownCareTypes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Task label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Morning medication"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </div>
            <Button onClick={handleAdd} disabled={create.isPending} className="w-full">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add template
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : grouped.length === 0 ? (
          <Card className="p-6 text-center">
            <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm mt-2">No templates yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {grouped.map(([ct, items]) => (
              <Card key={ct}>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm">{ct}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyToUpcomingShifts(ct)}
                    disabled={seed.isPending}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Apply to upcoming
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Input
                        defaultValue={t.label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== t.label) update.mutate({ id: t.id, label: v });
                        }}
                        className="h-9 text-sm flex-1"
                      />
                      <Input
                        type="number"
                        defaultValue={t.sort_order}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (Number.isFinite(v) && v !== t.sort_order)
                            update.mutate({ id: t.id, sort_order: v });
                        }}
                        className="h-9 text-sm w-16"
                      />
                      <Switch
                        checked={t.active}
                        onCheckedChange={(v) => update.mutate({ id: t.id, active: v })}
                      />
                      <button
                        onClick={() => del.mutate(t.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default AdminCareTasks;