import { useMemo, useState } from "react";
import { ArrowLeft, Upload, Trash2, FileText, Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAllCaregivers, useAllClients } from "@/hooks/useAdmin";
import { useAllCaregiverDocuments, useAllClientDocuments, type DocumentRow } from "@/hooks/useComplianceDocuments";
import { useUploadDocument, useDeleteDocument, getSignedDocumentUrl } from "@/hooks/useDocumentUpload";
import {
  REQUIRED_CAREGIVER_DOC_TYPES,
  OPTIONAL_CAREGIVER_DOC_TYPES,
  REQUIRED_CLIENT_DOC_TYPES,
  CAREGIVER_DOC_LABELS,
  CLIENT_DOC_LABELS,
  evaluateCaregiverCompleteness,
  evaluateClientCompleteness,
  statusMeta,
} from "@/lib/profileCompleteness";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { formatDate } from "@/lib/format";

type Kind = "caregiver" | "client";

const AdminDocuments = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Kind>("caregiver");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: caregivers = [] } = useAllCaregivers();
  const { data: clients = [] } = useAllClients();
  const { data: cgDocs } = useAllCaregiverDocuments();
  const { data: clDocs } = useAllClientDocuments();

  const items = tab === "caregiver" ? caregivers : clients;

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h2 className="text-xl font-bold text-foreground mb-1">Compliance Documents</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Upload, replace, or remove required compliance files.
        </p>

        <div className="flex gap-2 mb-4">
          {(["caregiver", "client"] as const).map((k) => (
            <button
              key={k}
              onClick={() => { setTab(k); setExpanded(null); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold ${
                tab === k ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {k === "caregiver" ? "Caregivers" : "Clients"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {items.map((entity: any) => {
            const id = entity.id;
            const docs: DocumentRow[] =
              (tab === "caregiver" ? cgDocs?.get(id) : clDocs?.get(id)) ?? [];
            const completeness =
              tab === "caregiver"
                ? evaluateCaregiverCompleteness(entity, docs as any)
                : evaluateClientCompleteness(entity, docs as any);
            const sm = statusMeta(completeness.status);
            const name = tab === "caregiver" ? entity.full_name : entity.name;
            const isOpen = expanded === id;

            return (
              <div key={id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="font-semibold text-sm text-card-foreground truncate">{name || "—"}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sm.className}`}>
                    {sm.label}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border p-3 space-y-2">
                    <DocList kind={tab} entityId={id} docs={docs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
};

function DocList({ kind, entityId, docs }: { kind: Kind; entityId: string; docs: DocumentRow[] }) {
  const required = kind === "caregiver" ? REQUIRED_CAREGIVER_DOC_TYPES : REQUIRED_CLIENT_DOC_TYPES;
  const optional = kind === "caregiver" ? OPTIONAL_CAREGIVER_DOC_TYPES : [];
  const labels = kind === "caregiver" ? CAREGIVER_DOC_LABELS : CLIENT_DOC_LABELS;
  const byType = useMemo(() => {
    const m = new Map<string, DocumentRow>();
    for (const d of docs) m.set(d.doc_type, d);
    return m;
  }, [docs]);

  return (
    <div className="space-y-2">
      {[...required, ...optional].map((dt) => (
        <DocRow
          key={dt}
          kind={kind}
          entityId={entityId}
          docType={dt}
          label={labels[dt] ?? dt}
          doc={byType.get(dt)}
          required={(required as readonly string[]).includes(dt)}
        />
      ))}
    </div>
  );
}

function DocRow({
  kind, entityId, docType, label, doc, required,
}: { kind: Kind; entityId: string; docType: string; label: string; doc?: DocumentRow; required: boolean }) {
  const upload = useUploadDocument(kind);
  const del = useDeleteDocument(kind);
  const [expiry, setExpiry] = useState<string>(doc?.expiry_date ?? "");
  const [busy, setBusy] = useState(false);

  const expired = doc?.expiry_date && new Date(doc.expiry_date).getTime() < Date.now();

  const onFile = async (file: File) => {
    try {
      setBusy(true);
      await upload.mutateAsync({
        entityId, docType, file,
        expiryDate: expiry || null,
        existingId: doc?.id ?? null,
      });
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const onView = async () => {
    if (!doc?.file_path) return;
    try {
      const url = await getSignedDocumentUrl(kind, doc.file_path);
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  };

  const onDelete = async () => {
    if (!doc) return;
    if (!confirm(`Remove ${label}?`)) return;
    try {
      await del.mutateAsync({ id: doc.id, filePath: doc.file_path });
      toast.success(`${label} removed`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {label}{required && <span className="text-destructive ml-0.5">*</span>}
          </span>
        </div>
        {doc?.file_path ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${expired ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
            {expired ? "Expired" : "On file"}
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Missing</span>
        )}
      </div>
      {doc?.expiry_date && (
        <p className="text-[10px] text-muted-foreground">Expires {formatDate(doc.expiry_date)}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="h-8 text-xs w-36"
          placeholder="Expiry"
        />
        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-accent">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {doc?.file_path ? "Replace" : "Upload"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
        </label>
        {doc?.file_path && (
          <>
            <button onClick={onView} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-accent">
              <Download className="w-3 h-3" /> View
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDocuments;