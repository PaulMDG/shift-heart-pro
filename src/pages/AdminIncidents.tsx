import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Loader2, AlertTriangle, Paperclip, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAllCaregivers, useAllClients, useAllShifts } from "@/hooks/useAdmin";
import { useAllIncidents, useCreateIncident, getIncidentAttachmentUrl, type IncidentRow } from "@/hooks/useIncidents";
import { formatDate, formatDateTime } from "@/lib/format";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const TYPES = [
  "Fall", "Injury", "Medication error", "Behavioral", "Property damage",
  "Missed visit", "Family complaint", "Other",
] as const;

const sevStyle: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminIncidents = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | typeof SEVERITIES[number]>("all");
  const [showForm, setShowForm] = useState(false);
  const { data: incidents = [], isLoading } = useAllIncidents();
  const { data: clients = [] } = useAllClients();
  const { data: caregivers = [] } = useAllCaregivers();

  const clientName = useMemo(() => new Map(clients.map((c: any) => [c.id, c.name])), [clients]);
  const cgName = useMemo(() => new Map(caregivers.map((c: any) => [c.id, c.full_name])), [caregivers]);

  const filtered = filter === "all" ? incidents : incidents.filter((i) => i.severity === filter);

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Incident Reports</h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(["all", ...SEVERITIES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${
                filter === f ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No incident reports{filter !== "all" ? ` at ${filter} severity` : ""}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((i) => (
              <IncidentCard
                key={i.id}
                inc={i}
                clientName={i.client_id ? clientName.get(i.client_id) : null}
                caregiverName={i.caregiver_id ? cgName.get(i.caregiver_id) : null}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <NewIncidentForm
          onClose={() => setShowForm(false)}
          clients={clients}
          caregivers={caregivers}
        />
      )}
    </MobileLayout>
  );
};

function IncidentCard({ inc, clientName, caregiverName }: { inc: IncidentRow; clientName?: string | null; caregiverName?: string | null }) {
  const onView = async () => {
    if (!inc.attachment_path) return;
    try {
      const url = await getIncidentAttachmentUrl(inc.attachment_path);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-card-foreground text-sm">{inc.incident_type}</h4>
          <p className="text-[11px] text-muted-foreground">{formatDateTime(inc.occurred_at)}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${sevStyle[inc.severity] ?? sevStyle.low}`}>
          {inc.severity}
        </span>
      </div>
      <p className="text-xs text-foreground whitespace-pre-wrap">{inc.description}</p>
      {inc.action_taken && (
        <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Action: </span>{inc.action_taken}</p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {clientName && <span>Client: <span className="text-foreground">{clientName}</span></span>}
        {caregiverName && <span>Caregiver: <span className="text-foreground">{caregiverName}</span></span>}
      </div>
      {inc.attachment_path && (
        <button onClick={onView} className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
          <Paperclip className="w-3 h-3" /> View attachment
        </button>
      )}
    </div>
  );
}

function NewIncidentForm({ onClose, clients, caregivers }: { onClose: () => void; clients: any[]; caregivers: any[] }) {
  const create = useCreateIncident();
  const { data: shifts = [] } = useAllShifts();
  const [incidentType, setIncidentType] = useState<string>("Fall");
  const [severity, setSeverity] = useState<string>("low");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [caregiverId, setCaregiverId] = useState<string>("");
  const [shiftId, setShiftId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error("Description is required"); return; }
    try {
      await create.mutateAsync({
        incident_type: incidentType,
        severity,
        description: description.trim(),
        action_taken: action.trim() || null,
        client_id: clientId || null,
        caregiver_id: caregiverId || null,
        shift_id: shiftId || null,
        occurred_at: new Date(occurredAt).toISOString(),
        attachment: file,
      });
      toast.success("Incident report saved");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-bold text-foreground">New Incident Report</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Occurred at</Label>
            <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description *</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Action taken</Label>
            <Textarea rows={2} value={action} onChange={(e) => setAction(e.target.value)} placeholder="What was done in response?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client</Label>
              <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caregiver</Label>
              <Select value={caregiverId || "none"} onValueChange={(v) => setCaregiverId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {caregivers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Related shift (optional)</Label>
            <Select value={shiftId || "none"} onValueChange={(v) => setShiftId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {shifts.slice(0, 100).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatDate(s.date)} · {s.client?.name ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Attachment (optional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} accept="image/*,application/pdf" />
          </div>
          <button type="submit" disabled={create.isPending} className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-bold disabled:opacity-50">
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Incident Report"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminIncidents;