import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Phone, AlertTriangle, FileText, Pencil, Save, X, Loader2, Trash2, Search } from "lucide-react";
import { useUpdateClient, useDeleteClient } from "@/hooks/useAdmin";
import { toast } from "@/components/ui/sonner";
import { geocodeAddress } from "@/lib/geocode";
import CompletenessBadge from "@/components/admin/CompletenessBadge";
import { useClientDocuments } from "@/hooks/useComplianceDocuments";
import { evaluateClientCompleteness } from "@/lib/profileCompleteness";

interface ClientDetailSheetProps {
  client: any;
  open: boolean;
  onClose: () => void;
}

const ClientDetailSheet = ({ client, open, onClose }: ClientDetailSheetProps) => {
  const [editing, setEditing] = useState(true);
  const [form, setForm] = useState({
    name: "",
    address: "",
    care_type: "",
    care_plan_summary: "",
    emergency_contact: "",
    emergency_phone: "",
    lat: "" as string,
    lng: "" as string,
    date_of_birth: "",
    phone: "",
    primary_language: "",
    responsible_party: "",
    billing_contact: "",
    service_type: "",
    service_start_date: "",
    authorized_hours_per_week: "",
    care_needs: "",
    home_safety: "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: docs } = useClientDocuments(client?.id);
  const completeness = client ? evaluateClientCompleteness(client, docs ?? []) : null;

  const resetForm = () => {
    setForm({
      name: client?.name || "",
      address: client?.address || "",
      care_type: client?.care_type || "",
      care_plan_summary: client?.care_plan_summary || "",
      emergency_contact: client?.emergency_contact || "",
      emergency_phone: client?.emergency_phone || "",
      lat: client?.lat != null ? String(client.lat) : "",
      lng: client?.lng != null ? String(client.lng) : "",
      date_of_birth: client?.date_of_birth || "",
      phone: client?.phone || "",
      primary_language: client?.primary_language || "",
      responsible_party: client?.responsible_party || "",
      billing_contact: client?.billing_contact || "",
      service_type: client?.service_type || "",
      service_start_date: client?.service_start_date || "",
      authorized_hours_per_week:
        client?.authorized_hours_per_week != null ? String(client.authorized_hours_per_week) : "",
      care_needs: client?.care_needs?.notes || "",
      home_safety: client?.home_safety?.notes || "",
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    // Build a partial update so unchanged fields (and fields not in this
    // form like government IDs on other entities) are never overwritten.
    const updates: Record<string, any> = { id: client.id };
    const fields = [
      "name",
      "address",
      "care_type",
      "care_plan_summary",
      "emergency_contact",
      "emergency_phone",
      "date_of_birth",
      "phone",
      "primary_language",
      "responsible_party",
      "billing_contact",
      "service_type",
      "service_start_date",
    ] as const;
    for (const key of fields) {
      const next = (form as any)[key] ?? "";
      const prev = client?.[key] ?? "";
      if (next !== prev) updates[key] = next;
    }
    // authorized_hours_per_week — numeric
    const ahw = form.authorized_hours_per_week.trim();
    const nextAhw = ahw === "" ? null : Number(ahw);
    if (ahw !== "" && !Number.isFinite(nextAhw)) {
      toast.error("Authorized hours must be a number");
      return;
    }
    if (nextAhw !== (client?.authorized_hours_per_week ?? null)) {
      updates.authorized_hours_per_week = nextAhw;
    }
    // jsonb fields
    const prevCareNeeds = client?.care_needs?.notes || "";
    if (form.care_needs !== prevCareNeeds) {
      updates.care_needs = { ...(client?.care_needs || {}), notes: form.care_needs };
    }
    const prevHomeSafety = client?.home_safety?.notes || "";
    if (form.home_safety !== prevHomeSafety) {
      updates.home_safety = { ...(client?.home_safety || {}), notes: form.home_safety };
    }
    // lat/lng — parse, validate, and only include if actually changed
    const parseCoord = (v: string) => {
      const t = v.trim();
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : undefined;
    };
    const nextLat = parseCoord(form.lat);
    const nextLng = parseCoord(form.lng);
    if (nextLat === undefined || nextLng === undefined) {
      toast.error("Latitude and longitude must be valid numbers");
      return;
    }
    if ((nextLat == null) !== (nextLng == null)) {
      toast.error("Set both latitude and longitude, or clear both");
      return;
    }
    if (nextLat !== (client?.lat ?? null)) updates.lat = nextLat;
    if (nextLng !== (client?.lng ?? null)) updates.lng = nextLng;

    try {
      await updateClient.mutateAsync(updates as any);
      toast.success("Client profile updated");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGeocode = async () => {
    if (!form.address.trim()) {
      toast.error("Enter an address first");
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(form.address);
      if (result) {
        setForm((f) => ({ ...f, lat: String(result.lat), lng: String(result.lng) }));
        toast.success(`Found: ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`);
      } else {
        toast.error("No match — refine the address or enter coordinates manually");
      }
    } catch {
      toast.error("Geocoding failed");
    } finally {
      setGeocoding(false);
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
            {completeness && (
              <div className="ml-2"><CompletenessBadge result={completeness} size="md" /></div>
            )}
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">GPS Coordinates</Label>
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={geocoding || !form.address.trim()}
                    className="text-[11px] font-semibold text-primary flex items-center gap-1 disabled:opacity-50"
                  >
                    {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Lookup from address
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    value={form.lat}
                    onChange={(e) => set("lat", e.target.value)}
                    placeholder="Latitude"
                    inputMode="decimal"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={form.lng}
                    onChange={(e) => set("lng", e.target.value)}
                    placeholder="Longitude"
                    inputMode="decimal"
                    className="h-9 text-sm"
                  />
                </div>
                {(!form.lat || !form.lng) && (
                  <p className="text-[11px] text-warning mt-1">
                    Coordinates required — caregivers cannot clock in without them.
                  </p>
                )}
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
              <h4 className="text-sm font-semibold text-foreground">Client Details</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Primary Language</Label>
                  <Input value={form.primary_language} onChange={(e) => set("primary_language", e.target.value)} placeholder="English" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Service Type</Label>
                  <Select value={form.service_type || undefined} onValueChange={(v) => set("service_type", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private_pay">Private pay</SelectItem>
                      <SelectItem value="medicaid">Medicaid</SelectItem>
                      <SelectItem value="medicare">Medicare</SelectItem>
                      <SelectItem value="ltc_insurance">LTC Insurance</SelectItem>
                      <SelectItem value="va">VA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Service Start</Label>
                  <Input type="date" value={form.service_start_date} onChange={(e) => set("service_start_date", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Authorized hrs/week</Label>
                  <Input type="number" step="0.5" value={form.authorized_hours_per_week} onChange={(e) => set("authorized_hours_per_week", e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsible Party</Label>
                <Input value={form.responsible_party} onChange={(e) => set("responsible_party", e.target.value)} placeholder="Name & relationship" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Billing Contact</Label>
                <Input value={form.billing_contact} onChange={(e) => set("billing_contact", e.target.value)} placeholder="Name, phone, or email" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground">Care Needs & Home Safety</h4>
              <div>
                <Label className="text-xs text-muted-foreground">Care Needs</Label>
                <Textarea value={form.care_needs} onChange={(e) => set("care_needs", e.target.value)} placeholder="ADLs, mobility, diet, meds…" className="text-sm min-h-[70px]" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Home Safety Notes</Label>
                <Textarea value={form.home_safety} onChange={(e) => set("home_safety", e.target.value)} placeholder="Stairs, pets, hazards, parking…" className="text-sm min-h-[70px]" />
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
