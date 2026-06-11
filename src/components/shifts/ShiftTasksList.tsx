import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import {
  useShiftTasks,
  useToggleShiftTask,
  useSeedShiftTasks,
  useAddShiftTask,
  useDeleteShiftTask,
} from "@/hooks/useShiftTasks";
import { toast } from "@/components/ui/sonner";

interface Props {
  shiftId: string;
  /** Admins can add/remove tasks; caregivers can only toggle completion. */
  canManage?: boolean;
  /** Auto-seed templates on first load if no tasks exist yet. */
  autoSeed?: boolean;
}

export default function ShiftTasksList({ shiftId, canManage = false, autoSeed = false }: Props) {
  const { data: tasks = [], isLoading } = useShiftTasks(shiftId);
  const toggle = useToggleShiftTask();
  const seed = useSeedShiftTasks();
  const addTask = useAddShiftTask();
  const del = useDeleteShiftTask();
  const [newLabel, setNewLabel] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!autoSeed || seeded || isLoading) return;
    if (tasks.length === 0) {
      setSeeded(true);
      seed.mutate(shiftId);
    }
  }, [autoSeed, seeded, isLoading, tasks.length, shiftId, seed]);

  const completed = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {tasks.length === 0
            ? "No tasks yet"
            : `${completed} of ${tasks.length} complete · ${pct}%`}
        </p>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              seed.mutate(shiftId, {
                onSuccess: (n) =>
                  toast.success(n ? `Added ${n} task${n === 1 ? "" : "s"} from templates` : "No matching templates"),
                onError: (e: any) => toast.error(e.message || "Failed to seed"),
              })
            }
            disabled={seed.isPending || tasks.length > 0}
          >
            {seed.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="ml-1.5">Seed from templates</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No tasks have been assigned for this shift yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <Checkbox
                id={`task-${t.id}`}
                checked={t.completed}
                disabled={toggle.isPending}
                onCheckedChange={(v) =>
                  toggle.mutate(
                    { id: t.id, completed: !!v, shiftId },
                    { onError: (e: any) => toast.error(e.message || "Failed to update") },
                  )
                }
              />
              <label
                htmlFor={`task-${t.id}`}
                className={`flex-1 text-sm cursor-pointer ${
                  t.completed ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {t.label}
              </label>
              {canManage && (
                <button
                  onClick={() =>
                    del.mutate(
                      { id: t.id, shiftId },
                      { onError: (e: any) => toast.error(e.message || "Failed to delete") },
                    )
                  }
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Remove task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add custom task"
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            disabled={!newLabel.trim() || addTask.isPending}
            onClick={() =>
              addTask.mutate(
                { shiftId, label: newLabel.trim() },
                {
                  onSuccess: () => setNewLabel(""),
                  onError: (e: any) => toast.error(e.message || "Failed to add"),
                },
              )
            }
          >
            {addTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}