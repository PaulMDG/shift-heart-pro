import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, AlertTriangle, FileText, Pencil, Save, X, Loader2, Trash2 } from "lucide-react";
import { useUpdateClient, useDeleteClient } from "@/hooks/useAdmin";
import { toast } from "@/components/ui/sonner";

interface ClientDetailSheetProps {
  client: any;
  open: boolean;
  onClose: () => void;
}

const ClientDetailSheet = ({ client, open, onClose }: ClientDetailSheetProps) => {
  const [editing, setEditing] = useState(true);
  const [form, setForm] = useState({ name: "", address: "", care_type: "", care_plan_summary: "", emergency_contact: "", emergency_phone: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const resetForm = () => {
    setForm({
      name: client?.name || "",
      address: client?.address || "",
      care_type: client?.care_type || "",
      care_plan_summary: client?.care_plan_summary || "",
      emergency_contact: client?.emergency_contact || "",
      emergency_phone: client?.emergency_phone || "",
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    try {
      await updateClient.mutateAsync({ id: client.id, ...form });
      toast.success("Client profile updated");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      toast.success("Client deleted");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!client) return null;

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setEditing(true); onClose(); } else { resetForm(); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto max-w-lg mx-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Client Profile</SheetTitle>
            {!editing ? (
              <button onClick={() => { resetForm(); setEditing(true); }} className="p-2 rounded-xl bg-accent hover:bg-accent/80 transition-colors">
                <Pencil className="w-4 h-4 text-accent-foreground" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={handleSave} disabled={updateClient.isPending} className="p-2 rounded-xl gradient-primary transition-colors">
                  {updateClient.isPending ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Save className="w-4 h-4 text-primary-foreground" />}
                </button>
              </div>
            )}
          </div>
        </SheetHeader>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Client Name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Care Type</Label>
                <Input value={form.care_type} onChange={(e) => set("care_type", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Care Plan Summary</Label>
                <Textarea value={form.care_plan_summary} onChange={(e) => set("care_plan_summary", e.target.value)} className="text-sm min-h-[80px]" />
              </div>
            </div>
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Emergency Contact
              </h4>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                <Input value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">{client.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{client.care_type}</span>
            </div>
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-foreground">{client.address || "No address"}</span>
              </div>
              {client.care_plan_summary && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-foreground">{client.care_plan_summary}</span>
                </div>
              )}
            </div>
            {(client.emergency_contact || client.emergency_phone) && (
              <div className="space-y-2 bg-destructive/5 rounded-2xl p-4 border border-destructive/20">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Emergency Contact
                </h4>
                {client.emergency_contact && <p className="text-sm text-foreground">{client.emergency_contact}</p>}
                {client.emergency_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-foreground">{client.emergency_phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delete Button */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors mt-4">
            <Trash2 className="w-4 h-4" /> Delete Client
          </button>
        ) : (
          <div className="space-y-2 mt-4">
            <p className="text-xs text-destructive font-semibold text-center">This will permanently delete this client. Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground">Cancel</button>
              <button onClick={handleDelete} disabled={deleteClient.isPending} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-50">
                {deleteClient.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClientDetailSheet;
