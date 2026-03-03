import type { ShiftStatus } from "@/data/mockData";

const statusConfig: Record<ShiftStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  missed: { label: "Missed", className: "bg-destructive/15 text-destructive" },
};

const StatusBadge = ({ status }: { status: ShiftStatus }) => {
  const config = statusConfig[status];
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
