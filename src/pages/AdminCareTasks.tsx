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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<{
    careType: string;
    targets: Array<{ id: string; date: string }>;
    alreadySeeded: number;
    toSeed: number;
    activeTemplates: number;
  } | null>(null);

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

  const openPreview = async (ct: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const matchingClientIds = new Set(
        (clients as any[]).filter((c) => c.care_type === ct).map((c) => c.id),
      );
      const today = new Date().toISOString().split("T")[0];
      const targets = (shifts as any[])
        .filter(
          (s) =>
            matchingClientIds.has(s.client_id) &&
            s.date >= today &&
            s.status !== "cancelled",
        )
        .map((s) => ({ id: s.id as string, date: s.date as string }));

      const activeTemplates = templates.filter(
        (t) => t.care_type === ct && t.active,
      ).length;

      let alreadySeeded = 0;
      if (targets.length > 0) {
        const { data, error } = await supabase
          .from("shift_tasks")
          .select("shift_id")
          .in(
            "shift_id",
            targets.map((t) => t.id),
          );
        if (error) throw error;
        const seededSet = new Set((data ?? []).map((r: any) => r.shift_id));
        alreadySeeded = targets.filter((t) => seededSet.has(t.id)).length;
      }

      setPreview({
        careType: ct,
        targets,
        alreadySeeded,
        toSeed: targets.length - alreadySeeded,
        activeTemplates,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmApply = async () => {
    if (!preview) return;
    setApplying(true);
    let added = 0;
    let seededShifts = 0;
    try {
      for (const t of preview.targets) {
        try {
          const n = await seed.mutateAsync(t.id);
          if ((n ?? 0) > 0) {
            added += n ?? 0;
            seededShifts += 1;
          }
        } catch {
          /* swallow per-shift errors */
        }
      }
      toast.success(
        `Seeded ${added} task${added === 1 ? "" : "s"} across ${seededShifts} shift${seededShifts === 1 ? "" : "s"}` +
          (preview.alreadySeeded > 0
            ? ` (${preview.alreadySeeded} already had tasks, skipped)`
            : ""),
      );
      setPreviewOpen(false);
      setPreview(null);
    } finally {
      setApplying(false);
    }
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
                    onClick={() => openPreview(ct)}
                    disabled={seed.isPending || previewLoading}
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

        <AlertDialog open={previewOpen} onOpenChange={(o) => !applying && setPreviewOpen(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply templates to upcoming shifts</AlertDialogTitle>
              <AlertDialogDescription asChild>
                {previewLoading || !preview ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculating impact…
                  </span>
                ) : (
                  <span className="block space-y-1 text-sm">
                    <span className="block">
                      Care type: <strong>{preview.careType}</strong>
                    </span>
                    <span className="block">
                      Active templates to apply: <strong>{preview.activeTemplates}</strong>
                    </span>
                    <span className="block">
                      Matching upcoming shifts: <strong>{preview.targets.length}</strong>
                    </span>
                    <span className="block text-muted-foreground">
                      {preview.toSeed} will be seeded · {preview.alreadySeeded} already have tasks (skipped)
                    </span>
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  confirmApply();
                }}
                disabled={
                  applying ||
                  previewLoading ||
                  !preview ||
                  preview.toSeed === 0 ||
                  preview.activeTemplates === 0
                }
              >
                {applying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Apply to {preview?.toSeed ?? 0} shift{preview?.toSeed === 1 ? "" : "s"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobileLayout>
  );
};

export default AdminCareTasks;